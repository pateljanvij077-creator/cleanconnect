import { calculateDistance } from './gps'

/**
 * Smart location matching algorithm for CleanConnect
 * Priority: 
 * 1. Same Society
 * 2. Same Area
 * 3. Same City
 * 4. GPS Distance
 * 
 * Also filters workers based on active subscription, approval and availability status.
 * 
 * @param {object} homeowner - Homeowner profile with location details
 * @param {Array} workers - List of workers fetched from Supabase
 * @param {Array} workerLocations - Locations associated with each worker
 * @returns {Array} List of matched, scored and sorted workers
 */
export function matchWorkers(homeowner, workers, workerLocations, systemSettings = []) {
  if (!homeowner || !workers) return []

  const homeownerLat = homeowner.latitude
  const homeownerLng = homeowner.longitude
  const homeownerSocietyId = homeowner.society_id
  const homeownerAreaId = homeowner.area_id
  const homeownerCityId = homeowner.city_id

  // Resolve homeowner's city name and area name from workerLocations for case-insensitive matching
  let homeownerCityName = ''
  if (homeownerCityId && workerLocations) {
    const matchingLoc = workerLocations.find(loc => loc.city_id === homeownerCityId)
    if (matchingLoc && matchingLoc.city_name) {
      homeownerCityName = matchingLoc.city_name.trim().toLowerCase()
    }
  }

  let homeownerAreaName = ''
  if (homeownerAreaId && workerLocations) {
    const matchingLoc = workerLocations.find(loc => loc.area_id === homeownerAreaId)
    if (matchingLoc && matchingLoc.area_name) {
      homeownerAreaName = matchingLoc.area_name.trim().toLowerCase()
    }
  }

  // Get settings helper
  const getSettingVal = (key, defaultVal) => {
    const s = systemSettings.find(item => item.key === key)
    return s ? s.value : defaultVal
  }

  const allowBusyVal = getSettingVal('allow_busy_workers', 'true') === 'true'

  const matchedAndScored = workers
    .map((worker) => {
      // Find all locations registered for this worker
      const locations = workerLocations.filter((loc) => loc.worker_id === worker.id)
      
      // Filter locations to only those in the homeowner's city (ID or name-based case-insensitive)
      const cityLocations = locations.filter(loc => {
        const matchesId = loc.city_id === homeownerCityId
        const matchesName = homeownerCityName && loc.city_name && 
                            loc.city_name.trim().toLowerCase() === homeownerCityName
        return matchesId || matchesName
      })

      const travelRadius = Number(worker.travel_radius || 10)
      let bestLocation = null
      let maxLocScore = -1
      let minDistance = Infinity
      let matchedLocationType = 'Same City'

      // A. Check Auto Location (Live GPS coordinates match) first
      let autoLocationMatched = false
      if (
        homeownerLat !== null && homeownerLat !== undefined &&
        homeownerLng !== null && homeownerLng !== undefined &&
        worker.latitude !== null && worker.latitude !== undefined &&
        worker.longitude !== null && worker.longitude !== undefined
      ) {
        const liveDistance = calculateDistance(
          homeownerLat,
          homeownerLng,
          worker.latitude,
          worker.longitude
        )

        if (liveDistance !== Infinity && liveDistance <= travelRadius) {
          autoLocationMatched = true
          const distanceScore = Math.max(0, 100 - liveDistance)
          // Live GPS gets a higher base score (2000) than Same Society (1000)
          maxLocScore = 2000 + distanceScore
          minDistance = liveDistance
          matchedLocationType = 'Auto Location'
        }
      }

      // B. Check registered locations in the city
      cityLocations.forEach((loc) => {
        let score = 0
        let type = 'Same City'

        const isSameSociety = (homeownerSocietyId && loc.society_id === homeownerSocietyId) ||
                              (homeowner.society_name && loc.society_name &&
                               loc.society_name.trim().toLowerCase() === homeowner.society_name.trim().toLowerCase())

        const isSameArea = (homeownerAreaId && loc.area_id === homeownerAreaId) ||
                           (homeownerAreaName && loc.area_name &&
                            loc.area_name.trim().toLowerCase() === homeownerAreaName)

        if (isSameSociety) {
          score = 1000 // Priority: Same Society
          type = 'Same Society'
        } else if (isSameArea) {
          score = 500 // Priority: Nearby Society (same area)
          type = 'Nearby Society'
        } else {
          score = 250 // Same City
          type = 'Same City'
        }

        // Calculate actual GPS distance between homeowner and worker location
        const distance = calculateDistance(
          homeownerLat, 
          homeownerLng, 
          loc.latitude, 
          loc.longitude
        )

        // If distance is finite, check worker's selected travel radius limit
        if (distance !== Infinity && distance > travelRadius) {
          // Homeowner is outside worker's service radius, ignore this location
          return
        }

        // Scoring adjustment based on distance (closer = higher score)
        const distanceScore = distance < Infinity ? Math.max(0, 100 - distance) : 0
        const totalLocScore = score + distanceScore

        if (totalLocScore > maxLocScore) {
          maxLocScore = totalLocScore
          minDistance = distance
          matchedLocationType = type
          bestLocation = loc
        }
      })

      // C. Fallback if coordinates are missing but same city/area/society name
      if (maxLocScore === -1 && cityLocations.length > 0) {
        const hasNullCoords = cityLocations.some(loc => loc.latitude === null || loc.longitude === null)
        if (hasNullCoords) {
          const fallbackLoc = cityLocations[0]
          minDistance = Infinity
          
          const isSameSociety = (homeownerSocietyId && fallbackLoc.society_id === homeownerSocietyId) ||
                                (homeowner.society_name && fallbackLoc.society_name &&
                                 fallbackLoc.society_name.trim().toLowerCase() === homeowner.society_name.trim().toLowerCase())

          const isSameArea = (homeownerAreaId && fallbackLoc.area_id === homeownerAreaId) ||
                             (homeownerAreaName && fallbackLoc.area_name &&
                              fallbackLoc.area_name.trim().toLowerCase() === homeownerAreaName)

          matchedLocationType = isSameSociety ? 'Same Society' : 
                               (isSameArea ? 'Nearby Society' : 'Same City')
          maxLocScore = isSameSociety ? 1000 : 
                        (isSameArea ? 500 : 250)
        }
      }

      if (maxLocScore === -1) {
        return null
      }

      // Add scoring based on rating and total completed jobs as tie-breakers
      const ratingBonus = Number(worker.rating || 0) * 5
      const experienceBonus = Math.min(10, Number(worker.experience_years || 0))
      
      // Availability priority: Available Now appears first
      const isAvailable = worker.availability_status === 'available'
      const isBusy = worker.availability_status === 'busy'
      const availabilityBonus = isAvailable ? 20000 : (isBusy ? 0 : -50000)

      const finalScore = maxLocScore + ratingBonus + experienceBonus + availabilityBonus

      return {
        ...worker,
        distance: minDistance,
        matchScore: finalScore,
        matchType: matchedLocationType
      }
    })
    .filter(Boolean)

  // Filters: must be approved, subscription active, active, and available/busy (based on settings)
  const activeWorkers = matchedAndScored.filter((w) => {
    const isApproved = w.verification_status === 'approved'
    const isSubActive = w.is_subscription_active
    const isActive = w.is_active !== false
    
    const isOfflineOrLeave = w.availability_status === 'offline' || w.availability_status === 'on_leave'
    const isBusy = w.availability_status === 'busy'
    
    if (isOfflineOrLeave) return false
    if (isBusy && !allowBusyVal) return false
    
    return isApproved && isSubActive && isActive
  })

  // Smart Search Expansion
  // If fewer than 10 workers are found, expand the search radius progressively
  const getWorkersInRadius = (workersList, radiusLimit) => {
    return workersList.filter(w => w.distance === Infinity || w.distance <= radiusLimit)
  }

  let finalWorkers = activeWorkers

  const workersUnder3km = getWorkersInRadius(activeWorkers, 3)
  if (workersUnder3km.length >= 10) {
    finalWorkers = workersUnder3km
  } else {
    const workersUnder5km = getWorkersInRadius(activeWorkers, 5)
    if (workersUnder5km.length >= 10) {
      finalWorkers = workersUnder5km
    } else {
      const workersUnder10km = getWorkersInRadius(activeWorkers, 10)
      if (workersUnder10km.length >= 10) {
        finalWorkers = workersUnder10km
      } else {
        finalWorkers = activeWorkers
      }
    }
  }

  // Sort: highest score first
  return finalWorkers.sort((a, b) => b.matchScore - a.matchScore)
}

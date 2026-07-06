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
      
      // Filter locations to only those in the homeowner's city
      const cityLocations = locations.filter(loc => loc.city_id === homeownerCityId)
      
      // If worker has no locations in the homeowner's city, they cannot match (Never Display Different City)
      if (cityLocations.length === 0) {
        return null
      }

      let bestLocation = null
      let maxLocScore = -1
      let minDistance = Infinity
      let matchedLocationType = 'Same City'

      // Check each location in the same city to find the best match
      cityLocations.forEach((loc) => {
        let score = 0
        let type = 'Same City'

        const isSameSociety = homeownerSocietyId && loc.society_id === homeownerSocietyId
        const isSameArea = homeownerAreaId && loc.area_id === homeownerAreaId

        if (isSameSociety) {
          score = 1000 // Highest priority: Same Society
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
        const travelRadius = Number(worker.travel_radius || 10)
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

      // Fallback if coordinates are missing but same city/area/society name
      if (maxLocScore === -1 && cityLocations.length > 0) {
        const hasNullCoords = cityLocations.some(loc => loc.latitude === null || loc.longitude === null)
        if (hasNullCoords) {
          const fallbackLoc = cityLocations[0]
          minDistance = Infinity
          matchedLocationType = fallbackLoc.society_id === homeownerSocietyId ? 'Same Society' : 
                               (fallbackLoc.area_id === homeownerAreaId ? 'Nearby Society' : 'Same City')
          maxLocScore = fallbackLoc.society_id === homeownerSocietyId ? 1000 : 
                        (fallbackLoc.area_id === homeownerAreaId ? 500 : 250)
        } else {
          return null
        }
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

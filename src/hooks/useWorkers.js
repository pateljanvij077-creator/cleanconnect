import { useState, useEffect, useCallback } from 'react'
import { getApprovedWorkers } from '../services/workers'
import { matchWorkers } from '../utils/matching'

export function useWorkers(homeownerProfile) {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAndMatchWorkers = useCallback(async () => {
    if (!homeownerProfile) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { workers: allWorkers, locations: allLocations, settings: allSettings } = await getApprovedWorkers()
      const sortedWorkers = matchWorkers(homeownerProfile, allWorkers, allLocations, allSettings)
      setWorkers(sortedWorkers)
    } catch (err) {
      console.error('Error fetching/matching workers:', err)
      setError('Failed to fetch nearby workers')
    } finally {
      setLoading(false)
    }
  }, [homeownerProfile])

  useEffect(() => {
    fetchAndMatchWorkers()
  }, [fetchAndMatchWorkers])

  return {
    workers,
    loading,
    error,
    refetch: fetchAndMatchWorkers
  }
}

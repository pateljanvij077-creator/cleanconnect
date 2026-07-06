import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { useAuth } from '../../hooks/useAuth'
import { useWorkers } from '../../hooks/useWorkers'
import WorkerCard from '../../components/common/WorkerCard'
import SkeletonCard from '../../components/common/SkeletonCard'
import { toggleFavorite, getFavorites } from '../../services/bookings'
import { Sparkles, SlidersHorizontal, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function HomeOwnerDashboard() {
  const navigate = useNavigate()
  const { homeowner } = useAuth()
  const { workers, loading, refetch } = useWorkers(homeowner)
  
  // Search and Filter states
  const [search, setSearch] = useState('')
  const [workerType, setWorkerType] = useState('all')
  const [minRating, setMinRating] = useState(0)
  const [maxDistance, setMaxDistance] = useState(15) // default 15km
  
  const [favList, setFavList] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  // Load homeowner favorites list
  useEffect(() => {
    if (homeowner) {
      getFavorites(homeowner.id)
        .then(data => setFavList(data.map(f => f.worker_id)))
        .catch(err => console.error(err))
    }
  }, [homeowner])

  const handleFavoriteToggle = async (workerId, nextFavState) => {
    if (!homeowner) return
    try {
      const success = await toggleFavorite(homeowner.id, workerId, nextFavState)
      if (success) {
        setFavList([...favList, workerId])
        toast.success('Added to favorites!')
      } else {
        setFavList(favList.filter(id => id !== workerId))
        toast.success('Removed from favorites')
      }
    } catch (err) {
      toast.error('Failed to update favorites')
    }
  }

  const handleBooking = (workerId) => {
    navigate(`/homeowner/book/${workerId}`)
  }

  const handleViewProfile = (workerId) => {
    navigate(`/homeowner/worker/${workerId}`)
  }

  // Filter workers locally based on selection
  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.full_name.toLowerCase().includes(search.toLowerCase())
    const matchesType = workerType === 'all' || w.worker_type === workerType || w.worker_type === 'both'
    const matchesRating = Number(w.rating || 0) >= minRating
    const matchesDistance = (w.distance === undefined || w.distance === Infinity) || w.distance <= maxDistance
    return matchesSearch && matchesType && matchesRating && matchesDistance
  })

  return (
    <HomeOwnerLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="fade-in">
        
        {/* Welcome Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Find Cleaning Workers near you
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Cleaners matched by Auto Location → Society → Area → City
            </p>
          </div>
        </div>

        {/* Filter controls bar */}
        <div className="card glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search 
                size={18} 
                color="var(--text-muted)" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search worker by name..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="btn btn-secondary"
              style={{ gap: '6px' }}
            >
              <SlidersHorizontal size={18} />
              <span>Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="grid-3 slide-up" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Worker Type</label>
                <select className="form-select" value={workerType} onChange={(e) => setWorkerType(e.target.value)}>
                  <option value="all">All Service Types</option>
                  <option value="home_cleaning">Home Cleaning Only</option>
                  <option value="office_cleaning">Office Cleaning Only</option>
                  <option value="both">Home & Office Cleaning</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Min Star Rating</label>
                <select className="form-select" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                  <option value={0}>Show All Ratings</option>
                  <option value={4}>4.0 ★ & Above</option>
                  <option value={4.5}>4.5 ★ & Above</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Max Distance ({maxDistance} km)</label>
                <input 
                  type="range" 
                  min={1} 
                  max={30} 
                  value={maxDistance} 
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Workers Feed Grid */}
        {loading ? (
          <div className="grid-3">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🧹</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Workers Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '360px' }}>
              Try broadening your search filters or manual location coordinates to see more cleaners nearby.
            </p>
          </div>
        ) : (
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Nearby Matched Cleaners ({filteredWorkers.length})
            </h4>
            <div className="grid-3">
              {filteredWorkers.map(w => (
                <WorkerCard 
                  key={w.id}
                  worker={w}
                  distance={w.distance}
                  isFavorited={favList.includes(w.id)}
                  onFavoriteToggle={handleFavoriteToggle}
                  onBook={handleBooking}
                  onViewProfile={handleViewProfile}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </HomeOwnerLayout>
  )
}

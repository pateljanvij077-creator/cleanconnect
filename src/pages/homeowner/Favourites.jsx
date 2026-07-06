import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getFavorites, toggleFavorite } from '../../services/bookings'
import { useAuth } from '../../hooks/useAuth'
import WorkerCard from '../../components/common/WorkerCard'
import { Heart, HeartCrack } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function Favourites() {
  const navigate = useNavigate()
  const { homeowner } = useAuth()
  const [favoritesList, setFavoritesList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (homeowner) {
      getFavorites(homeowner.id)
        .then(data => setFavoritesList(data.map(f => f.workers)))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [homeowner])

  const handleFavoriteToggle = async (workerId, nextFavState) => {
    if (!homeowner) return
    try {
      await toggleFavorite(homeowner.id, workerId, nextFavState)
      setFavoritesList(favoritesList.filter(w => w.id !== workerId))
      toast.success('Removed from favorites')
    } catch (err) {
      toast.error('Failed to update favorites')
    }
  }

  return (
    <HomeOwnerLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
          >
            <Heart size={28} color="var(--danger)" fill="var(--danger)" />
          </motion.div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Saved Cleaners</h2>
            {!loading && favoritesList.length > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {favoritesList.length} cleaner{favoritesList.length !== 1 ? 's' : ''} saved
              </p>
            )}
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}
          >
            <div className="spinner" style={{ width: '40px', height: '40px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading favourites...</p>
          </motion.div>
        ) : favoritesList.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="card glass flex-center"
            style={{ padding: '4rem 2rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HeartCrack size={48} color="var(--text-muted)" />
            </motion.div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Saved Cleaners</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
              Tap the ❤️ heart on any cleaner card to save them here for fast scheduling.
            </p>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/homeowner/dashboard')}
              className="btn btn-primary"
              style={{ marginTop: '0.5rem' }}
            >
              Find Cleaners
            </motion.button>
          </motion.div>
        ) : (
          <motion.div layout className="grid-3">
            <AnimatePresence mode="popLayout">
              {favoritesList.map((w, idx) => (
                <motion.div
                  key={w.id}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.93 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88, y: -10 }}
                  transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 15,
                    delay: idx * 0.06
                  }}
                >
                  <WorkerCard
                    worker={w}
                    isFavorited={true}
                    onFavoriteToggle={handleFavoriteToggle}
                    onBook={(id) => navigate(`/homeowner/book/${id}`)}
                    onViewProfile={(id) => navigate(`/homeowner/worker/${id}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

      </div>
    </HomeOwnerLayout>
  )
}

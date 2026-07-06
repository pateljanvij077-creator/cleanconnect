import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getWorkerById } from '../../services/workers'
import { getStatusClass, formatCurrency } from '../../utils/helpers'
import { Star, ArrowLeft, Phone, MessageCircle, MapPin, BadgeCheck, ShieldAlert, Briefcase, Globe } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }
}

export default function WorkerDetail() {
  const { workerId } = useParams()
  const navigate = useNavigate()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWorkerById(workerId)
      .then(setWorker)
      .catch(err => {
        console.error(err)
        toast.error('Failed to load cleaner profile')
      })
      .finally(() => setLoading(false))
  }, [workerId])

  if (loading) {
    return (
      <HomeOwnerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '1rem' }}>
          <div className="spinner" style={{ width: '48px', height: '48px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading profile...</p>
        </div>
      </HomeOwnerLayout>
    )
  }

  if (!worker) {
    return (
      <HomeOwnerLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card glass flex-center"
          style={{ padding: '3rem', flexDirection: 'column', gap: '1rem' }}
        >
          <span style={{ fontSize: '3rem' }}>🔍</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Profile Not Found</h3>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>Back</button>
        </motion.div>
      </HomeOwnerLayout>
    )
  }

  const handleCall = () => {
    window.open(`tel:${worker.phone}`)
  }

  const handleWhatsapp = () => {
    const cleanPhone = worker.phone.replace(/[^0-9]/g, '')
    const message = encodeURIComponent(`Hello ${worker.full_name}, I saw your profile on CleanConnect and would like to talk about a booking request.`)
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank')
  }

  return (
    <HomeOwnerLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}
      >

        {/* Back control */}
        <motion.div variants={itemVariants}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ width: 'fit-content', gap: '4px' }}>
            <ArrowLeft size={16} /> Back to Search
          </button>
        </motion.div>

        {/* Hero Profile Card */}
        <motion.div
          variants={itemVariants}
          className="card glass glass-glow"
          style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', position: 'relative', overflow: 'hidden' }}
        >
          {/* Decorative background blob */}
          <div
            className="floating-blob"
            style={{ background: 'var(--primary)', width: '200px', height: '200px', top: '-50px', right: '-50px', opacity: 0.06 }}
          />

          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {worker.avatar_url ? (
              <img
                src={worker.avatar_url}
                alt={worker.full_name}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--primary)',
                  boxShadow: '0 0 0 6px var(--primary-glow)'
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 6px var(--primary-glow)'
              }}>
                <Star size={48} color="white" />
              </div>
            )}
            {worker.is_verified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.4 }}
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  background: 'var(--success)',
                  borderRadius: '50%',
                  padding: '2px',
                  border: '2px solid white'
                }}
              >
                <BadgeCheck size={14} color="white" />
              </motion.div>
            )}
          </motion.div>

          <div style={{ flex: 1, minWidth: '240px', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{worker.full_name}</h2>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'capitalize' }}>
              {worker.worker_type?.replace('_', ' ')} • {worker.gender}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span className={`badge ${getStatusClass(worker.availability_status)}`}>
                {worker.availability_status}
              </span>
              <span className="badge badge-verified" style={{ textTransform: 'none' }}>
                {worker.experience_years} Years Experience
              </span>
              {worker.rating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: 700, fontSize: '13px', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Star size={13} fill="#f59e0b" /> {Number(worker.rating).toFixed(1)} ({worker.total_jobs || 0} jobs)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 1 }}>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCall}
              className="btn btn-secondary"
              style={{ gap: '6px' }}
            >
              <Phone size={16} /> Call Cleaner
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleWhatsapp}
              className="btn btn-secondary"
              style={{ gap: '6px' }}
            >
              <MessageCircle size={16} /> WhatsApp
            </motion.button>
          </div>
        </motion.div>

        {/* Bio, Rates, Locations details */}
        <motion.div variants={itemVariants} className="grid-2">
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="var(--primary)" /> Biography
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {worker.bio || 'No biography written yet.'}
            </p>

            {(worker.languages || []).length > 0 && (
              <>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginTop: '0.5rem' }}>Languages Spoken</h4>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(worker.languages || []).map((l, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="badge badge-verified"
                      style={{ textTransform: 'none' }}
                    >
                      {l}
                    </motion.span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} color="var(--primary)" /> Pricing Rate Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Hourly Rate</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(worker.pricing_per_hour)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Daily Rate</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(worker.pricing_per_day)}</span>
              </div>
              {worker.pricing_note && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Note: {worker.pricing_note}
                </p>
              )}
            </div>

            <div style={{ marginTop: 'auto' }}>
              {!worker.is_subscription_active ? (
                <motion.button
                  className="btn btn-danger"
                  disabled
                  style={{ width: '100%', gap: '6px' }}
                >
                  <ShieldAlert size={18} /> Booking Disabled (Sub Expired)
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/homeowner/book/${worker.id}`)}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Proceed to Booking
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Reviews List */}
        <motion.div variants={itemVariants} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Ratings & Reviews</h3>

          {(!worker.reviews || worker.reviews.length === 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem' }}>⭐</span>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                No ratings submitted yet for this cleaner.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {worker.reviews.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {r.homeowners?.full_name || 'Home Owner'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f59e0b', fontWeight: 700, fontSize: '13px', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                      <Star size={14} fill="#f59e0b" /> {r.rating}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {r.comment}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </motion.div>
    </HomeOwnerLayout>
  )
}

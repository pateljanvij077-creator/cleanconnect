import React from 'react'
import { Phone, Star, MessageCircle, Heart, User, CheckCircle2, ShieldAlert } from 'lucide-react'
import { formatCurrency, getStatusClass } from '../../utils/helpers'
import { formatDistance } from '../../utils/gps'
import { motion, AnimatePresence } from 'framer-motion'

export default function WorkerCard({
  worker,
  distance,
  isFavorited,
  onFavoriteToggle,
  onBook,
  onViewProfile
}) {
  const {
    id,
    full_name,
    gender,
    experience_years,
    worker_type,
    pricing_per_hour,
    rating,
    total_jobs,
    languages = [],
    is_subscription_active,
    availability_status,
    avatar_url
  } = worker

  const handleWhatsapp = (e) => {
    e.stopPropagation()
    const cleanPhone = worker.phone.replace(/[^0-9]/g, '')
    const message = encodeURIComponent(`Hello ${full_name}, I saw your profile on CleanConnect and would like to talk about a booking request.`)
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank')
  }

  const handleCall = (e) => {
    e.stopPropagation()
    window.open(`tel:${worker.phone}`)
  }

  const formatWorkerType = (type) => {
    switch (type) {
      case 'home_cleaning': return 'Home Cleaning'
      case 'office_cleaning': return 'Office Cleaning'
      case 'both': return 'Home & Office Cleaning'
      default: return 'Cleaning Worker'
    }
  }

  return (
    <motion.div
      className="card glass card-hover"
      onClick={() => onViewProfile(id)}
      whileHover={{ y: -6, boxShadow: 'var(--shadow-lg)' }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, type: 'spring', stiffness: 120, damping: 16 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Profile Photo with Overlays */}
      <div style={{ position: 'relative', height: '160px', width: '100%', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
        {avatar_url ? (
          <motion.img
            src={avatar_url}
            alt={full_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
            <User size={48} color="white" />
          </div>
        )}

        {/* Gradient overlay for better text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none'
        }} />

        {/* Favorite toggle overlay with spring animation */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation()
            onFavoriteToggle(id, !isFavorited)
          }}
          whileTap={{ scale: 1.5 }}
          whileHover={{ scale: 1.15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isFavorited ? 'favorited' : 'not-favorited'}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            >
              <Heart
                size={18}
                color={isFavorited ? '#ef4444' : '#fff'}
                fill={isFavorited ? '#ef4444' : 'transparent'}
              />
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {/* Verification badge */}
        {worker.is_verified && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              background: 'var(--success-light)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--success)'
            }}
          >
            <CheckCircle2 size={12} /> VERIFIED
          </motion.div>
        )}
      </div>

      {/* Basic Profile Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {full_name}
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              ({gender})
            </span>
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {formatWorkerType(worker_type)}
          </p>
        </div>

        {/* Availability Badge */}
        <span className={`badge ${getStatusClass(availability_status)}`}>
          {availability_status}
        </span>
      </div>

      {/* Ratings and Stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', color: '#f59e0b', fontWeight: 700 }}>
          <Star size={16} fill="#f59e0b" style={{ marginRight: '2px' }} />
          {rating ? Number(rating).toFixed(1) : 'New'}
        </div>
        <span style={{ color: 'var(--text-muted)' }}>•</span>
        <span>{experience_years} yrs Exp</span>
        <span style={{ color: 'var(--text-muted)' }}>•</span>
        <span>{total_jobs || 0} jobs</span>
      </div>

      {/* Target match / location / pricing details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginTop: '0.25rem' }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Rate: </span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
            {formatCurrency(pricing_per_hour)}/hr
          </span>
        </div>

        {distance !== undefined && distance !== Infinity && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              fontSize: '0.85rem',
              background: 'var(--primary-light)',
              padding: '2px 8px',
              borderRadius: '8px',
              color: 'var(--primary)',
              fontWeight: 600
            }}
          >
            {formatDistance(distance)} away
          </motion.div>
        )}
      </div>

      {/* Languages */}
      {languages.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.25rem' }}>
          {languages.slice(0, 3).map((lang, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-glass)'
              }}
            >
              {lang}
            </span>
          ))}
          {languages.length > 3 && (
            <span style={{ fontSize: '11px', padding: '2px 6px', color: 'var(--text-muted)' }}>
              +{languages.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Actions row */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          className="btn btn-secondary btn-sm"
          onClick={handleCall}
          title="Call Cleaner"
        >
          <Phone size={14} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          className="btn btn-secondary btn-sm"
          onClick={handleWhatsapp}
          title="Chat WhatsApp"
        >
          <MessageCircle size={14} />
        </motion.button>

        {!is_subscription_active ? (
          <button
            className="btn btn-danger btn-sm"
            disabled
            style={{ flex: 1, display: 'flex', gap: '4px', fontSize: '11px', padding: '4px 6px' }}
          >
            <ShieldAlert size={14} /> Sub Expired
          </button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={(e) => {
              e.stopPropagation()
              onBook(id)
            }}
          >
            Book Now
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

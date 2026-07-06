import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Star, ShieldCheck, BadgeAlert, Plus, Edit3, MapPin, User, CreditCard, BookOpen } from 'lucide-react'
import { getWorkerLocations } from '../../services/workers'
import { motion } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 }
  }
}

export default function WorkerProfile() {
  const navigate = useNavigate()
  const { worker } = useAuth()
  const [locations, setLocations] = useState([])

  useEffect(() => {
    if (worker) {
      getWorkerLocations(worker.id).then(setLocations).catch(err => console.error(err))
    }
  }, [worker])

  if (!worker) return null

  return (
    <WorkerLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}
      >

        {/* Profile Card Header */}
        <motion.div
          variants={itemVariants}
          className="card glass glass-glow"
          style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', position: 'relative', overflow: 'hidden' }}
        >
          {/* Background decoration */}
          <div className="floating-blob" style={{ background: 'var(--primary)', width: '180px', height: '180px', top: '-60px', right: '-60px', opacity: 0.06 }} />

          {/* Avatar */}
          <motion.div whileHover={{ scale: 1.05 }} style={{ position: 'relative', zIndex: 1 }}>
            {worker.avatar_url ? (
              <img
                src={worker.avatar_url}
                alt={worker.full_name}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--primary)',
                  boxShadow: '0 0 0 5px var(--primary-glow)'
                }}
              />
            ) : (
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 5px var(--primary-glow)'
              }}>
                <User size={36} color="white" />
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
                <ShieldCheck size={14} color="white" />
              </motion.div>
            )}
          </motion.div>

          <div style={{ flex: 1, minWidth: '240px', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{worker.full_name}</h2>
              {!worker.is_verified && (
                <span className="badge badge-pending">PENDING APPROVAL</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {worker.worker_type?.replace('_', ' ')} • {worker.gender}
            </p>

            {worker.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0.5rem', color: '#f59e0b', fontWeight: 700 }}>
                <Star size={15} fill="#f59e0b" />
                <span>{Number(worker.rating).toFixed(1)}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px' }}>({worker.total_jobs || 0} jobs)</span>
              </div>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/worker/edit-profile')}
            className="btn btn-primary"
            style={{ gap: '6px', zIndex: 1 }}
          >
            <Edit3 size={16} /> Edit Profile
          </motion.button>
        </motion.div>

        {/* Detailed Info Cards */}
        <motion.div variants={itemVariants} className="grid-2">
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--primary)" /> Profile Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Experience', value: `${worker.experience_years} Years` },
                { label: 'Date of Birth', value: formatDate(worker.dob) },
                { label: 'Primary Phone', value: worker.phone },
                { label: 'Backup Phone', value: worker.phone2 || '—' },
                { label: 'Languages', value: (worker.languages || []).join(', ') || '—' },
              ].map(({ label, value }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent',
                    fontSize: '0.88rem'
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="var(--primary)" /> Service Pricing
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--primary-light)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Hourly Rate</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(worker.pricing_per_hour)}/hr</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>Daily Rate</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(worker.pricing_per_day)}/day</span>
              </div>
              {worker.pricing_note && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.4rem 0' }}>
                  Note: {worker.pricing_note}
                </p>
              )}

              {/* UPI status */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: worker.upi_qr_url ? 'var(--success-light)' : 'var(--danger-light)',
                  color: worker.upi_qr_url ? 'var(--success)' : 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                {worker.upi_qr_url ? (
                  <><ShieldCheck size={16} /> UPI QR Code Uploaded</>
                ) : (
                  <><BadgeAlert size={16} /> No UPI QR (Homeowners cannot scan & pay)</>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div variants={itemVariants} className="card glass">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--primary)" /> About Me (Bio)
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
            {worker.bio || 'No details provided yet. Edit your profile to add a biography.'}
          </p>
        </motion.div>

        {/* Locations & GPS Coverage */}
        <motion.div variants={itemVariants} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={18} color="var(--primary)" />
            Primary Location & Work Areas
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
            {worker.latitude && worker.longitude ? (
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                <strong>GPS Coordinates:</strong> {worker.latitude.toFixed(6)}, {worker.longitude.toFixed(6)}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                GPS coordinates not set.
              </p>
            )}
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>Current Area:</strong> {worker.current_area || 'Not Set'}
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>Current City:</strong> {worker.current_city || 'Not Set'}
            </p>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>All Configured Locations</h4>
            {locations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No locations configured yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {locations.map((loc, idx) => (
                  <motion.div
                    key={loc.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    style={{
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: loc.is_primary ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                      border: loc.is_primary ? '1px solid rgba(99,102,241,0.15)' : 'none'
                    }}
                  >
                    <span>📍</span>
                    <span style={{ fontWeight: loc.is_primary ? 700 : 400, flex: 1 }}>
                      {loc.city_name} → {loc.area_name} ({loc.society_name || 'All Societies'})
                    </span>
                    {loc.is_primary && (
                      <span className="badge badge-verified" style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 6px' }}>
                        PRIMARY
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </WorkerLayout>
  )
}

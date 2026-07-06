import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Briefcase, Sparkles, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

export default function RoleSelection() {
  const navigate = useNavigate()

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.15 + i * 0.15,
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    })
  }

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      overflow: 'hidden'
    }}>
      {/* Decorative Moving Blobs */}
      <div className="floating-blob" style={{ background: 'var(--primary)', top: '10%', right: '10%', opacity: 0.08 }} />
      <div className="floating-blob" style={{ background: 'var(--secondary)', bottom: '10%', left: '10%', opacity: 0.08, animationDelay: '-10s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="card glass glass-glow" 
        style={{ 
          width: '100%', 
          maxWidth: '520px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          textAlign: 'center',
          zIndex: 1
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'var(--gradient-primary)',
              padding: '12px',
              borderRadius: '16px',
              display: 'flex',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={28} />
          </motion.div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Select Account Type</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Choose how you would like to use CleanConnect
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
          {/* Homeowner Card */}
          <motion.div 
            custom={0}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="card glass glass-glow"
            onClick={() => navigate('/auth/homeowner-signup')}
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <Home size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>I am a Home Owner</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                I want to find, connect with, and book verified cleaners in my area
              </p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </motion.div>

          {/* Worker Card */}
          <motion.div 
            custom={1}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            className="card glass glass-glow"
            onClick={() => navigate('/auth/worker-signup')}
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '12px',
              borderRadius: '12px'
            }}>
              <Briefcase size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>I am a Cleaner / Worker</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                I offer cleaning services and want to receive job bookings
              </p>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </motion.div>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/auth') }} style={{ fontWeight: 600 }}>Login here</a>
        </div>
      </motion.div>
    </div>
  )
}

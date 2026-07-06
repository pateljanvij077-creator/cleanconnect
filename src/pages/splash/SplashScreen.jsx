import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../supabase/client'
import { getUserProfile } from '../../services/auth'
import { motion } from 'framer-motion'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    async function checkSession() {
      // Delay slightly for presentation
      await new Promise(r => setTimeout(r, 2000))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/auth')
        return
      }

      try {
        const profile = await getUserProfile(session.user.id)
        if (profile?.roles?.name === 'admin') {
          navigate('/admin/dashboard')
        } else if (profile?.roles?.name === 'worker') {
          navigate('/worker/dashboard')
        } else if (profile?.roles?.name === 'homeowner') {
          navigate('/homeowner/dashboard')
        } else {
          navigate('/auth/select-role')
        }
      } catch (err) {
        console.error('Error verifying user role:', err)
        navigate('/auth')
      }
    }

    checkSession()
  }, [navigate])

  const titleText = "CleanConnect"
  const letters = titleText.split("")

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at center, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
      color: 'var(--text-primary)',
      gap: '1.5rem',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Decorative Floating Blobs */}
      <div className="floating-blob" style={{ background: 'var(--primary)', top: '20%', left: '15%', opacity: 0.1 }} />
      <div className="floating-blob" style={{ background: 'var(--secondary)', bottom: '20%', right: '15%', opacity: 0.1, animationDelay: '-10s' }} />

      {/* Logo Container */}
      <motion.div 
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
        style={{
          background: 'var(--gradient-primary)',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          color: 'white',
          boxShadow: '0 8px 32px 0 var(--primary-glow)',
          marginBottom: '0.5rem',
          zIndex: 1
        }}
      >
        <Sparkles size={48} />
      </motion.div>

      {/* Staggered Title */}
      <div style={{ display: 'flex', gap: '2px', zIndex: 1 }}>
        {letters.map((char, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: 0.2 + index * 0.04, 
              type: 'spring', 
              stiffness: 150, 
              damping: 10 
            }}
            style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              background: 'var(--gradient-primary)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>
      
      {/* Tagline */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500, zIndex: 1 }}
      >
        Find verified cleaning professionals near you
      </motion.p>

      {/* Loading Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="spinner" 
        style={{ marginTop: '1rem', width: '32px', height: '32px', zIndex: 1 }} 
      />
    </div>
  )
}

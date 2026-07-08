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

      {/* Logo Card */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.1 }}
        style={{
          background: 'var(--bg-secondary)',
          padding: '2rem',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-glass)',
          maxWidth: '340px',
          width: '85%',
          zIndex: 1
        }}
      >
        <img 
          src="/logo.png" 
          alt="CleanConnect" 
          style={{ 
            width: '100%', 
            height: 'auto',
            objectFit: 'contain',
            borderRadius: 'var(--radius-md)'
          }} 
        />
      </motion.div>

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

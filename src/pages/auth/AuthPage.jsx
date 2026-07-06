import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { signIn } from '../../services/auth'
import { getUserProfile } from '../../services/auth'
import { supabase } from '../../supabase/client'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function AuthPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      let authEmail = email
      if (!email.includes('@')) {
        // Try looking up the registered email using the RPC function
        const { data: dbEmail, error: rpcError } = await supabase.rpc('get_user_email_by_phone', { phone_input: email })
        if (dbEmail) {
          authEmail = dbEmail
        } else {
          authEmail = `${email}@cleanconnect.com`
        }
      }
      const data = await signIn(authEmail, password)
      toast.success('Logged in successfully!')
      
      const profile = await getUserProfile(data.user.id)
      const userRole = profile?.roles?.name

      if (userRole === 'admin') {
        navigate('/admin/dashboard')
      } else if (userRole === 'worker') {
        navigate('/worker/dashboard')
      } else if (userRole === 'homeowner') {
        navigate('/homeowner/dashboard')
      } else {
        navigate('/auth/select-role')
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
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
      {/* Moving Blobs */}
      <div className="floating-blob" style={{ background: 'var(--primary)', top: '10%', left: '10%', opacity: 0.08 }} />
      <div className="floating-blob" style={{ background: 'var(--secondary)', bottom: '10%', right: '10%', opacity: 0.08, animationDelay: '-8s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        className="card glass glass-glow" 
        style={{ 
          width: '100%', 
          maxWidth: '440px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.5rem',
          zIndex: 1
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'var(--gradient-primary)',
              padding: '12px',
              borderRadius: '16px',
              display: 'flex',
              color: 'white',
              boxShadow: '0 4px 20px 0 var(--primary-glow)',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={28} />
          </motion.div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Find verified cleaners or receive job bookings
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Email Address or Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={18} 
                color="var(--text-muted)" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input 
                type="text" 
                className="form-input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com or 9876543210"
                style={{ paddingLeft: '2.5rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={18} 
                color="var(--text-muted)" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="form-input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  color: 'var(--text-muted)'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Remember Me</span>
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); toast('Password reset link sent to your registered email') }}>
              Forgot Password?
            </a>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Login'}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.9rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>New to CleanConnect? </span>
          <Link to="/auth/select-role" style={{ fontWeight: 600 }}>
            Create Account
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

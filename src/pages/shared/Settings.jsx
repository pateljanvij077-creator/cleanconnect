import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAppStore } from '../../store/appStore'
import { supabase } from '../../supabase/client'
import { toast } from 'react-hot-toast'
import { Settings as SettingsIcon, Shield, Moon, Sun, Lock } from 'lucide-react'

function SettingsContent() {
  const { theme, toggleTheme } = useAppStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("Passwords don't match")
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password updated successfully!')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', margin: '0 auto' }} className="fade-in">
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Account Settings</h2>

      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SettingsIcon size={18} /> Global Preferences
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>App Interface Theme</span>
          <button 
            type="button"
            onClick={toggleTheme} 
            className="btn btn-secondary btn-sm" 
            style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}</span>
          </button>
        </div>
      </div>

      {/* Security update password card */}
      <form onSubmit={handlePasswordUpdate} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={18} /> Update Security Password
        </h3>
        
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">New Password</label>
          <input 
            type="password" 
            className="form-input" 
            placeholder="••••••••" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Confirm New Password</label>
          <input 
            type="password" 
            className="form-input" 
            placeholder="••••••••" 
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={updating}>
          {updating ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}

export default function Settings() {
  const { role } = useAuth()
  
  if (role === 'worker') {
    return (
      <WorkerLayout>
        <SettingsContent />
      </WorkerLayout>
    )
  }
  
  return (
    <HomeOwnerLayout>
      <SettingsContent />
    </HomeOwnerLayout>
  )
}

import React, { useEffect, useState } from 'react'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import LocationPicker from '../../components/maps/LocationPicker'
import { toast } from 'react-hot-toast'
import { Download } from 'lucide-react'

export default function HOProfile() {
  const { homeowner, user, refreshProfile } = useAuth()
  
  // Profile fields state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [societyName, setSocietyName] = useState('')
  const [houseNumber, setHouseNumber] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  
  const [updating, setUpdating] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(window.deferredPrompt)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream)
    setIsStandalone(window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches)

    const handleInstallable = () => {
      setInstallPrompt(window.deferredPrompt)
    }
    window.addEventListener('pwa-installable', handleInstallable)
    return () => window.removeEventListener('pwa-installable', handleInstallable)
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      window.deferredPrompt = null
    }
  }

  useEffect(() => {
    if (homeowner) {
      setFullName(homeowner.full_name || '')
      setPhone(homeowner.phone || '')
      setEmail(homeowner.email || '')
      setSocietyName(homeowner.society_name || '')
      setHouseNumber(homeowner.house_number || '')
      setAddress(homeowner.address || '')
      setLatitude(homeowner.latitude || null)
      setLongitude(homeowner.longitude || null)
    }
  }, [homeowner])

  const handleLocationChange = (coords) => {
    setLatitude(coords.latitude)
    setLongitude(coords.longitude)
    setAddress(coords.address)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!fullName || !phone || !address) {
      toast.error('Name, Phone and Address are required')
      return
    }

    setUpdating(true)
    try {
      // 1. Update users profile
      const { error: userErr } = await supabase
        .from('users')
        .update({ full_name: fullName, phone, email })
        .eq('id', user.id)

      if (userErr) throw userErr

      // 2. Update homeowners details
      const { error: hoErr } = await supabase
        .from('homeowners')
        .update({
          full_name: fullName,
          phone,
          email,
          society_name: societyName,
          house_number: houseNumber,
          address,
          latitude,
          longitude
        })
        .eq('user_id', user.id)

      if (hoErr) throw hoErr

      toast.success('Profile updated successfully!')
      await refreshProfile()
    } catch (err) {
      console.error(err)
      toast.error('Failed to update profile details')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <HomeOwnerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Profile Settings</h2>

        <form onSubmit={handleSave} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Phone Number</label>
              <input 
                type="tel" 
                className="form-input" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Society Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={societyName} 
                onChange={e => setSocietyName(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">House / Flat Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={houseNumber} 
                onChange={e => setHouseNumber(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Delivery Address</label>
            <textarea 
              className="form-input" 
              rows={2} 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              required
            />
          </div>

          {/* Map pin location update picker */}
          <LocationPicker 
            lat={latitude} 
            lng={longitude} 
            onLocationChange={handleLocationChange} 
          />

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={updating}>
            {updating ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Save Profile Changes'}
          </button>
        </form>

        {/* App Installation Section */}
        {(!isStandalone && (installPrompt || isIOS)) && (
          <div className="card glass" style={{ border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Download size={18} color="var(--primary)" /> Install CleanConnect App
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              Install CleanConnect as a lightweight app on your phone or computer. This makes it easy to open the dashboard directly from your home screen with offline capability.
            </p>
            {installPrompt && (
              <button 
                onClick={handleInstallClick} 
                className="btn btn-primary" 
                style={{ gap: '6px', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', height: '40px' }}
              >
                <Download size={16} /> Install Now
              </button>
            )}
            {isIOS && !installPrompt && (
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>📱</span>
                <span>On iOS (iPhone/iPad): Tap the <strong>Share</strong> button in Safari and select <strong>Add to Home Screen</strong> to install.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </HomeOwnerLayout>
  )
}

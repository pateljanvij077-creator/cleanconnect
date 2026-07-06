import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, Calendar, Heart, Bell, User, Settings, LogOut, Sun, Moon, Sparkles, MapPin, Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { getUnreadNotificationCount, subscribeToNotifications } from '../../services/notifications'
import { signOut } from '../../services/auth'
import { supabase } from '../../supabase/client'
import { toast } from 'react-hot-toast'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'
import { findOrCreateState, findOrCreateCity, findOrCreateArea, findOrCreateSociety } from '../../services/locations'

export default function HomeOwnerLayout({ children }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const { homeowner, user, refreshProfile } = useAuth()
  const { theme, toggleTheme } = useAppStore()
  const [unread, setUnread] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [autoDetecting, setAutoDetecting] = useState(false)

  const autoDetectLocation = async () => {
    if (autoDetecting || !user) return
    setAutoDetecting(true)
    try {
      const coords = await getCurrentPosition()
      const details = await getLocationDetails(coords.lat, coords.lng)
      
      let stateId = homeowner?.state_id || null
      let cityId = homeowner?.city_id || null
      let areaId = homeowner?.area_id || null
      let societyId = homeowner?.society_id || null

      if (details.state) {
        const st = await findOrCreateState(details.state)
        stateId = st.id
      }
      if (details.city && stateId) {
        const ct = await findOrCreateCity(details.city, stateId)
        cityId = ct.id
      }
      if (details.area && cityId) {
        const ar = await findOrCreateArea(details.area, cityId)
        areaId = ar.id
      }
      if (details.society && areaId && cityId) {
        const soc = await findOrCreateSociety({
          name: details.society,
          areaId,
          cityId,
          latitude: coords.lat,
          longitude: coords.lng,
          address: details.address
        })
        societyId = soc.id
      }

      const { error } = await supabase
        .from('homeowners')
        .update({
          state_id: stateId,
          city_id: cityId,
          area_id: areaId,
          society_id: societyId,
          society_name: details.society || homeowner?.society_name || 'My Location',
          address: details.address || homeowner?.address || '',
          latitude: coords.lat,
          longitude: coords.lng
        })
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('Location auto-detected successfully!')
      if (refreshProfile) {
        await refreshProfile()
      }
    } catch (err) {
      console.error('Error auto-detecting location:', err)
      toast.error('Location detection failed. Please allow GPS or update manually.')
    } finally {
      setAutoDetecting(false)
    }
  }

  useEffect(() => {
    if (homeowner && (!homeowner.latitude || !homeowner.longitude || !homeowner.society_name)) {
      autoDetectLocation()
    }
  }, [homeowner, user])

  useEffect(() => {
    if (!user) return

    // Load initial count
    getUnreadNotificationCount(user.id).then(setUnread)

    // Listen to changes realtime
    const channel = subscribeToNotifications(user.id, () => {
      setUnread((prev) => prev + 1)
    })

    return () => {
      if (channel) channel.unsubscribe()
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (err) {
      console.error(err)
    }
  }

  const allNavItems = [
    { label: 'Find Cleaners', path: '/homeowner/dashboard', icon: Home },
    { label: 'Bookings', path: '/homeowner/bookings', icon: Calendar },
    { label: 'Favourites', path: '/homeowner/favourites', icon: Heart },
    { label: 'Alerts', path: '/homeowner/notifications', icon: Bell, badge: unread },
    { label: 'Profile Settings', path: '/homeowner/profile', icon: User },
  ]
  const bottomNavItems = [
    allNavItems[0], // Find Cleaners
    allNavItems[1], // Bookings
    allNavItems[3], // Alerts
  ]
  const profileNavItems = [
    allNavItems[2], // Favourites
    allNavItems[4], // Profile Settings
  ]

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar glass ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '0.5rem' }}>
            <div style={{
              background: 'var(--gradient-primary)',
              padding: '8px',
              borderRadius: '12px',
              display: 'flex',
              color: 'white'
            }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.05em' }}>CleanConnect</h1>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em' }}>HOMEOWNER</span>
            </div>
          </div>
          {/* Close button for mobile inside sidebar */}
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', border: 'none', background: 'transparent', padding: '0.5rem' }}>
            <X size={20} className="md-hidden" />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {allNavItems.map((item, idx) => {
            const Icon = item.icon
            const isActive = loc.pathname === item.path
            return (
              <Link 
                key={idx} 
                to={item.path}
                className="btn btn-ghost"
                style={{ 
                  justifyContent: 'flex-start',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  position: 'relative'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={toggleTheme} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Top Navbar */}
        <header className="glass app-header" style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          borderBottom: '1px solid var(--border-glass)',
          position: 'sticky',
          top: 0,
          zIndex: 9
        }}>
          {/* Left section: Location */}
          <div 
            onClick={autoDetectLocation}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'background var(--transition-fast)'
            }}
            className="glass-hover"
            title="Click to automatically re-detect your current GPS location"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                background: 'var(--primary-light)',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                color: 'var(--primary)',
                animation: autoDetecting ? 'pulse 1.5s infinite' : 'none'
              }}>
                <MapPin size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {autoDetecting ? 'DETECTING...' : 'LOCATION'}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {autoDetecting ? 'Finding GPS...' : (homeowner?.society_name || 'Detecting...')}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', position: 'relative' }}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{homeowner?.full_name}</h4>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{homeowner?.phone}</span>
              </div>
              {homeowner?.avatar_url ? (
                <img src={homeowner.avatar_url} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="var(--primary)" />
                </div>
              )}

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  right: 0,
                  width: '200px',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 100,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-glass)',
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  {profileNavItems.map((item, i) => {
                    const Icon = item.icon
                    return (
                      <Link key={i} to={item.path} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}>
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                  <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--danger)' }}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <motion.main 
          style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {bottomNavItems.map((item, idx) => {
          const Icon = item.icon
          const isActive = loc.pathname === item.path
          return (
            <Link 
              key={idx} 
              to={item.path}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="icon-container">
                <Icon size={20} />
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '12px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-glass)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

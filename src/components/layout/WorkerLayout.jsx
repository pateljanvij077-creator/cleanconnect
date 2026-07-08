import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, ClipboardList, Briefcase, Bell, User, LogOut, Sun, Moon, Sparkles, AlertCircle, X, MapPin, Settings } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { getUnreadNotificationCount, subscribeToNotifications } from '../../services/notifications'
import { updateWorkerAvailability } from '../../services/workers'
import { signOut } from '../../services/auth'
import { toast } from 'react-hot-toast'
import LocationModal from '../common/LocationModal'

let workerPrompted = false

export default function WorkerLayout({ children }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const { worker, user, refreshProfile } = useAuth()
  const { theme, toggleTheme } = useAppStore()
  const [unread, setUnread] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isAvailable, setIsAvailable] = useState(worker?.is_available || false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  useEffect(() => {
    if (worker) {
      setIsAvailable(worker.is_available)
    }
  }, [worker])

  useEffect(() => {
    if (worker && !workerPrompted) {
      setIsLocationModalOpen(true)
      workerPrompted = true
    }
  }, [worker])

  useEffect(() => {
    if (!worker) {
      workerPrompted = false
    }
  }, [worker])

  useEffect(() => {
    if (!user) return

    getUnreadNotificationCount(user.id).then(setUnread)

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

  const handleAvailabilityToggle = async () => {
    if (!worker) return
    const nextVal = !isAvailable
    try {
      await updateWorkerAvailability(worker.id, {
        isAvailable: nextVal,
        status: nextVal ? 'available' : 'offline'
      })
      setIsAvailable(nextVal)
      toast.success(nextVal ? 'You are now online & visible!' : 'You are offline')
      await refreshProfile()
    } catch (err) {
      toast.error('Failed to update availability')
    }
  }

  const allNavItems = [
    { label: 'Dashboard', path: '/worker/dashboard', icon: Home },
    { label: 'Requests', path: '/worker/requests', icon: ClipboardList },
    { label: 'Upcoming', path: '/worker/upcoming', icon: Briefcase },
    { label: 'Alerts', path: '/worker/notifications', icon: Bell, badge: unread },
    { label: 'Subscriptions', path: '/worker/subscription', icon: Settings },
    { label: 'My Profile', path: '/worker/profile', icon: User },
  ]
  const bottomNavItems = allNavItems.slice(0, 4)
  const profileNavItems = allNavItems.slice(4)

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
              background: '#ffffff',
              padding: '6px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-glass)'
            }}>
              <img 
                src="/logo-icon.png" 
                alt="CleanConnect" 
                style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>CleanConnect</h1>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em' }}>WORKER PRO</span>
            </div>
          </div>
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', border: 'none', background: 'transparent', padding: '0.5rem' }}>
            <X size={20} className="md-hidden" />
          </button>
        </div>

        {/* Availability Quick Switch */}
        <div className="card glass" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Duty Status</span>
            <span className={`badge ${isAvailable ? 'badge-verified' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
              {isAvailable ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <button 
            onClick={handleAvailabilityToggle} 
            className={`btn btn-sm ${isAvailable ? 'btn-danger' : 'btn-primary'}`}
            style={{ width: '100%' }}
          >
            {isAvailable ? 'Go Offline' : 'Go Online'}
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

      {/* Main Area */}
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
          {/* Left section: Logo & App Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: '#ffffff',
              padding: '4px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-glass)'
            }}>
              <img 
                src="/logo-icon.png" 
                alt="CleanConnect" 
                style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
              />
            </div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>CleanConnect</h1>
            
            {worker?.verification_status !== 'approved' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '10px', fontWeight: 600, background: 'var(--warning-light)', padding: '2px 6px', borderRadius: '4px' }}>
                <AlertCircle size={10} />
                <span>Reviewing</span>
              </div>
            )}
          </div>

          {/* Right section: Profile Avatar only */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              {worker?.avatar_url ? (
                <img src={worker.avatar_url} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }}>
                  <User size={18} color="var(--primary)" />
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
          style={{ padding: '1.25rem', flex: 1, overflowY: 'auto' }}
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

      {/* Zomato-style Location Picker Popup */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        worker={worker}
        user={user}
        onLocationUpdated={async () => {
          if (refreshProfile) {
            await refreshProfile()
          }
        }}
        forceSelection={!worker?.latitude || !worker?.longitude || (!worker?.current_city && !worker?.current_area)}
      />
    </div>
  )
}

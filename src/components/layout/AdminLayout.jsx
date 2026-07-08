import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Users, ShieldCheck, User, Settings, LogOut, Sun, Moon, MapPin, Sparkles, LayoutDashboard, CreditCard, MessageSquare, Bell, Menu, X, Lock, Briefcase, Tag, Star, Database } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import { signOut } from '../../services/auth'

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const { user } = useAuth()
  const { theme, toggleTheme } = useAppStore()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/auth')
    } catch (err) {
      console.error(err)
    }
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Directory', path: '/admin/users', icon: Users },
    { label: 'Verified Workers', path: '/admin/workers', icon: ShieldCheck },
    { label: 'Home Owners', path: '/admin/homeowners', icon: User },
    { label: 'Platform Bookings', path: '/admin/bookings', icon: Briefcase },
    { label: 'Payment Logs', path: '/admin/payments', icon: CreditCard },
    { label: 'Geo Locations', path: '/admin/locations', icon: MapPin },
    { label: 'Service Catalog', path: '/admin/services', icon: Tag },
    { label: 'Review Moderation', path: '/admin/reviews', icon: Star },
    { label: 'User Complaints', path: '/admin/complaints', icon: MessageSquare },
    { label: 'Push Broadcast', path: '/admin/notifications', icon: Bell },
    { label: 'Roles & Access', path: '/admin/roles-permissions', icon: Lock },
    { label: 'Backup & Retention', path: '/admin/backup-retention', icon: Database },
    { label: 'System Config', path: '/admin/settings', icon: Settings },
  ]

  const bottomNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Cleaners', path: '/admin/workers', icon: ShieldCheck },
    { label: 'Bookings', path: '/admin/bookings', icon: Briefcase },
  ]

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Admin Sidebar */}
      <aside className={`app-sidebar glass ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
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
              <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, letterSpacing: '0.1em' }}>SYS ADMIN</span>
            </div>
          </div>
          <button className="menu-toggle" onClick={() => setIsSidebarOpen(false)} style={{ display: 'flex', border: 'none', background: 'transparent', padding: '0.5rem' }}>
            <X size={20} className="md-hidden" />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item, idx) => {
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
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-main">
        <header className="glass app-header" style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          borderBottom: '1px solid var(--border-glass)',
          position: 'sticky',
          top: 0,
          zIndex: 9
        }}>
          {/* Left section: Menu toggle, Logo & App Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
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
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }} className="md-hidden">CleanConnect</h1>
          </div>

          {/* Right section: Admin badge only */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }} title="System Administrator">
              <ShieldCheck size={18} color="var(--danger)" />
            </div>
          </div>
        </header>

        <motion.main 
          style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}
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
              </div>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

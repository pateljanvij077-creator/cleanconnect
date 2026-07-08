import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import { getWorkerBookings } from '../../services/bookings'
import { updateWorkerAvailability, updateWorkerGPSLocation } from '../../services/workers'
import { formatDate, formatCurrency, getStatusClass } from '../../utils/helpers'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Briefcase, CheckCircle, ShieldAlert, Star, ToggleLeft, Clock, MapPin, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'
import { motion, AnimatePresence } from 'framer-motion'
import LocationModal from '../../components/common/LocationModal'

const statVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      type: 'spring',
      stiffness: 120,
      damping: 14
    }
  })
}

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const { worker, user, refreshProfile } = useAuth()

  // Dashboard states
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(worker?.is_available || false)
  const [availabilityStatus, setAvailabilityStatus] = useState(worker?.availability_status || 'offline')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  // Auto-refresh GPS on app launch (Dashboard mount)
  useEffect(() => {
    if (worker) {
      getCurrentPosition()
        .then(async (coords) => {
          const details = await getLocationDetails(coords.lat, coords.lng)
          await updateWorkerGPSLocation(worker.id, {
            latitude: coords.lat,
            longitude: coords.lng,
            cityName: details.city,
            areaName: details.area
          })
          await refreshProfile()
        })
        .catch(err => {
          console.error('Failed to auto-update worker GPS on launch:', err)
        })
    }
  }, [worker?.id])

  useEffect(() => {
    if (worker) {
      setIsAvailable(worker.is_available)
      setAvailabilityStatus(worker.availability_status)

      // Load bookings & compute stats
      getWorkerBookings(worker.id)
        .then(data => {
          setBookings(data)
          const comp = data.filter(b => b.status === 'completed').length
          const pend = data.filter(b => b.status === 'pending').length
          setStats({ total: data.length, completed: comp, pending: pend })
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [worker])

  const handleStatusChange = async (e) => {
    const nextStatus = e.target.value
    const nextAvailable = nextStatus === 'available'

    try {
      await updateWorkerAvailability(worker.id, {
        isAvailable: nextAvailable,
        status: nextStatus
      })
      setIsAvailable(nextAvailable)
      setAvailabilityStatus(nextStatus)
      toast.success(`Availability updated to ${nextStatus.toUpperCase()}`)

      // Refresh GPS when coming online
      if (nextAvailable) {
        toast.loading('Refreshing GPS location...', { id: 'gps-refresh' })
        try {
          const coords = await getCurrentPosition()
          const details = await getLocationDetails(coords.lat, coords.lng)
          await updateWorkerGPSLocation(worker.id, {
            latitude: coords.lat,
            longitude: coords.lng,
            cityName: details.city,
            areaName: details.area
          })
          toast.success('GPS location refreshed!', { id: 'gps-refresh' })
        } catch (gpsErr) {
          console.error(gpsErr)
          toast.error('Could not refresh GPS location.', { id: 'gps-refresh' })
        }
      }

      await refreshProfile()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  // Pre-process bookings data for Recharts (bookings per day)
  const getChartData = () => {
    const counts = {}
    bookings.slice(0, 10).forEach(b => {
      const date = formatDate(b.service_date)
      counts[date] = (counts[date] || 0) + 1
    })
    return Object.keys(counts).map(k => ({ date: k, Bookings: counts[k] }))
  }

  const statItems = [
    { value: stats.total, label: 'Total Requests', color: 'var(--primary)', icon: Briefcase },
    { value: stats.completed, label: 'Completed Jobs', color: 'var(--success)', icon: CheckCircle },
    { value: stats.pending, label: 'Pending Invites', color: 'var(--warning)', icon: Clock },
    {
      value: worker?.rating ? Number(worker.rating).toFixed(1) : 'New',
      label: 'Average Rating',
      color: '#f59e0b',
      icon: Star,
      isStar: true
    }
  ]

  return (
    <WorkerLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Zomato-Style Location Bar & Duty State selector */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', alignItems: 'stretch' }}>
            {/* Zomato Location Button */}
            <div 
              onClick={() => setIsLocationModalOpen(true)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-glass)',
                borderRadius: '16px',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flex: 1,
                minWidth: '260px'
              }}
              className="glass-hover"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                <div style={{
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MapPin size={20} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    YOUR WORK LOCATION
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {worker?.current_area ? `${worker.current_area}, ${worker.current_city || 'Ahmedabad'}` : worker?.current_city || 'Set your location...'}
                  </span>
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
                paddingLeft: '0.5rem'
              }}>
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Duty State Card */}
            <div className="card glass" style={{ 
              padding: '0.5rem 1rem', 
              margin: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              borderRadius: '16px',
              border: '1px solid var(--border-glass)',
              boxShadow: 'var(--shadow-sm)',
              height: 'auto',
              minWidth: '160px',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Duty State:</span>
              <select 
                className="form-select" 
                style={{ 
                  padding: '4px 20px 4px 8px', 
                  fontSize: '13px', 
                  fontWeight: 700,
                  width: 'auto', 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }} 
                value={availabilityStatus} 
                onChange={handleStatusChange}
              >
                <option value="available">🟢 Available</option>
                <option value="busy">🟡 Busy</option>
                <option value="on_leave">🟠 Leave</option>
                <option value="offline">🔴 Offline</option>
              </select>
            </div>
          </div>
        </motion.div>


        {/* Animated Stats Row */}
        <div className="grid-4">
          {statItems.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={i}
                custom={i}
                variants={statVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
                className="card glass"
                style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}
              >
                {/* Background accent */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: stat.color,
                  opacity: 0.06,
                  pointerEvents: 'none'
                }} />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 200 }}
                  style={{
                    display: 'inline-flex',
                    padding: '8px',
                    borderRadius: '10px',
                    background: `${stat.color}18`,
                    marginBottom: '0.5rem'
                  }}
                >
                  <Icon size={20} color={stat.color} fill={stat.isStar ? stat.color : 'none'} />
                </motion.div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  {stat.value}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{stat.label}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Subscription Alert status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 100, damping: 15 }}
          className="card glass"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
        >
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Subscription Tier Status
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {worker?.is_subscription_active
                ? `Active until ${formatDate(worker.subscription_expiry)}`
                : 'Your subscription is expired! You will not appear in homeowner searches.'}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/worker/subscription')}
            className={`btn ${worker?.is_subscription_active ? 'btn-secondary' : 'btn-primary'}`}
          >
            {worker?.is_subscription_active ? 'View Plan' : 'Renew Subscription'}
          </motion.button>
        </motion.div>

        {/* Chart and Recent items grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="grid-2"
        >
          {/* Chart */}
          <div className="card glass" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="var(--primary)" /> Recent Booking Activity
            </h3>
            {bookings.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem' }}>📊</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>No data to display</p>
              </div>
            ) : (
              <div style={{ flex: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                      contentStyle={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="Bookings" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quick list of pending invites */}
          <div className="card glass" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Recent Requests</h3>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/worker/requests')}
                className="btn btn-ghost btn-sm"
                style={{ padding: '2px 8px' }}
              >
                View All
              </motion.button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
              <AnimatePresence>
                {bookings.filter(b => b.status === 'pending').slice(0, 3).map((b, idx) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: idx * 0.07 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{b.homeowners?.full_name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(b.service_date)} at {b.service_time}</p>
                    </div>
                    <span className={`badge ${getStatusClass(b.status)}`}>{b.status}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {bookings.filter(b => b.status === 'pending').length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ margin: 'auto', textAlign: 'center' }}
                >
                  <span style={{ fontSize: '2rem' }}>✅</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>No pending requests</p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

      </div>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        worker={worker}
        user={user}
        onLocationUpdated={async () => {
          await refreshProfile()
        }}
      />
    </WorkerLayout>
  )
}

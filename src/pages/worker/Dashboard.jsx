import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import { getWorkerBookings } from '../../services/bookings'
import { updateWorkerAvailability } from '../../services/workers'
import { formatDate, formatCurrency, getStatusClass } from '../../utils/helpers'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Briefcase, CheckCircle, ShieldAlert, Star, ToggleLeft, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const { worker, refreshProfile } = useAuth()
  
  // Dashboard states
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(worker?.is_available || false)
  const [availabilityStatus, setAvailabilityStatus] = useState(worker?.availability_status || 'offline')

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

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Welcome Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome Back, {worker?.full_name}! 👋</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Manage your jobs, availability status and subscriptions
            </p>
          </div>

          {/* Status selector */}
          <div className="card glass flex-center" style={{ padding: '0.5rem 1rem', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>Duty State:</span>
            <select className="form-select" style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }} value={availabilityStatus} onChange={handleStatusChange}>
              <option value="available">🟢 Available for Work</option>
              <option value="busy">🟡 Currently Busy</option>
              <option value="on_leave">🟠 On Leave</option>
              <option value="offline">🔴 Offline</option>
            </select>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid-4">
          <div className="card glass" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{stats.total}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Requests</p>
          </div>
          <div className="card glass" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>{stats.completed}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Completed Jobs</p>
          </div>
          <div className="card glass" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>{stats.pending}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pending Invites</p>
          </div>
          <div className="card glass" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Star size={20} fill="#f59e0b" /> {worker?.rating ? Number(worker.rating).toFixed(1) : 'New'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Average Rating</p>
          </div>
        </div>

        {/* Subscription Alert status */}
        <div className="card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
          
          <button 
            onClick={() => navigate('/worker/subscription')} 
            className={`btn ${worker?.is_subscription_active ? 'btn-secondary' : 'btn-primary'}`}
          >
            {worker?.is_subscription_active ? 'View Plan' : 'Renew Subscription'}
          </button>
        </div>

        {/* Chart and Recent items grid */}
        <div className="grid-2">
          {/* Chart */}
          <div className="card glass" style={{ height: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Recent Booking Activity</h3>
            {bookings.length === 0 ? (
              <p style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No data to display</p>
            ) : (
              <div style={{ flex: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
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
              <button onClick={() => navigate('/worker/requests')} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>
                View All
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1 }}>
              {bookings.filter(b => b.status === 'pending').slice(0, 3).map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{b.homeowners?.full_name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(b.service_date)} at {b.service_time}</p>
                  </div>
                  <span className={`badge ${getStatusClass(b.status)}`}>{b.status}</span>
                </div>
              ))}
              {bookings.filter(b => b.status === 'pending').length === 0 && (
                <p style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending requests</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </WorkerLayout>
  )
}

import React, { useEffect, useState } from 'react'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { getWorkerBookings, updateBookingStatus, confirmBookingCall } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { updateWorkerGPSLocation } from '../../services/workers'
import { formatDate, formatTime } from '../../utils/helpers'
import { Phone, Check, X, AlertCircle, ClipboardList, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'
import { motion, AnimatePresence } from 'framer-motion'
import JobRouteMap from '../../components/maps/JobRouteMap'

export default function BookingRequests() {
  const { worker } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMapMap, setShowMapMap] = useState({}) // keyed by booking ID

  // Track checkboxes for confirmation calls per booking ID
  const [callConfirmedMap, setCallConfirmedMap] = useState({})

  useEffect(() => {
    if (worker) {
      getWorkerBookings(worker.id)
        .then(data => setRequests(data.filter(b => b.status === 'pending')))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [worker])

  const handleCall = (booking) => {
    window.open(`tel:${booking.homeowners?.phone}`)
    // Auto toggle confirmation call maps or prompt
    setCallConfirmedMap(prev => ({ ...prev, [booking.id]: true }))
  }

  const handleAccept = async (booking) => {
    if (!callConfirmedMap[booking.id]) {
      toast.error('You must call & confirm with the homeowner first!')
      return
    }

    try {
      await updateBookingStatus(booking.id, 'accepted', { call_confirmed: true })
      toast.success('Booking request accepted!')

      // Refresh GPS when accepting work
      try {
        const coords = await getCurrentPosition()
        const details = await getLocationDetails(coords.lat, coords.lng)
        await updateWorkerGPSLocation(worker.id, {
          latitude: coords.lat,
          longitude: coords.lng,
          cityName: details.city,
          areaName: details.area
        })
      } catch (gpsErr) {
        console.error('Failed to update GPS on accept:', gpsErr)
      }

      // Notify Homeowner
      await createNotification(
        booking.homeowners.id,
        'Booking Accepted',
        `${worker.full_name} has accepted your booking request for ${formatDate(booking.service_date)}!`,
        'booking',
        { bookingId: booking.id }
      )

      setRequests(requests.filter(r => r.id !== booking.id))
    } catch (err) {
      toast.error('Failed to accept booking')
    }
  }

  const handleReject = async (booking) => {
    const reason = window.prompt('Please enter reason for rejection (optional):')
    if (reason === null) return // cancelled prompt

    try {
      await updateBookingStatus(booking.id, 'rejected', {
        cancellation_reason: reason || 'Cleaner is unavailable'
      })
      toast.success('Booking request rejected')

      // Notify Homeowner
      await createNotification(
        booking.homeowners.id,
        'Booking Rejected',
        `${worker.full_name} rejected your booking request. Reason: ${reason || 'Unavailable'}`,
        'booking',
        { bookingId: booking.id }
      )

      setRequests(requests.filter(r => r.id !== booking.id))
    } catch (err) {
      toast.error('Failed to reject booking')
    }
  }

  return (
    <WorkerLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <div style={{
            background: 'var(--primary-light)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            color: 'var(--primary)'
          }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Booking Requests</h2>
            {!loading && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {requests.length} pending request{requests.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </motion.div>

        {/* States */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}
          >
            <div className="spinner" style={{ width: '40px', height: '40px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading requests...</p>
          </motion.div>
        ) : requests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="card glass flex-center"
            style={{ padding: '4rem 2rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            >
              <AlertCircle size={48} color="var(--text-muted)" />
            </motion.div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Pending Requests</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
              Homeowner service request invites will appear here when you receive them.
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <AnimatePresence mode="popLayout">
              {requests.map((r, idx) => (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -60, scale: 0.94 }}
                  transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 16,
                    delay: idx * 0.07
                  }}
                  className="card glass"
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{r.homeowners?.full_name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Requested: {formatDate(r.service_date)} at {formatTime(r.service_time)}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        📍 <strong>Address:</strong> {r.address}
                      </p>
                      
                      {/* Map Toggle Button */}
                      {(r.latitude || r.homeowners?.latitude) && (
                        <button 
                          onClick={() => setShowMapMap(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '4px 8px', fontSize: '12px', marginTop: '0.25rem', gap: '4px', height: 'auto', minHeight: 'auto', display: 'flex', alignItems: 'center' }}
                        >
                          <MapPin size={12} color="var(--primary)" /> 
                          {showMapMap[r.id] ? 'Hide Location Map' : 'View Location on Map'}
                        </button>
                      )}

                      {showMapMap[r.id] && (
                        <JobRouteMap
                          workerLat={worker?.latitude}
                          workerLng={worker?.longitude}
                          homeownerLat={r.latitude || r.homeowners?.latitude}
                          homeownerLng={r.longitude || r.homeowners?.longitude}
                          workerAvatar={worker?.selfie_url || worker?.avatar_url}
                          homeownerAvatar={r.homeowners?.avatar_url}
                          homeownerName={r.homeowners?.full_name}
                          address={r.address}
                        />
                      )}
                      {r.notes && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '6px', marginTop: '0.5rem' }}>
                          📝 <strong>Notes:</strong> {r.notes}
                        </p>
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCall(r)}
                      className="btn btn-secondary"
                      style={{ gap: '6px' }}
                    >
                      <Phone size={16} /> Call Home Owner
                    </motion.button>
                  </div>

                  <div style={{ borderTop: '1px dashed var(--border-glass)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    {/* Call confirmation checkbox */}
                    <motion.label
                      whileHover={{ scale: 1.01 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}
                    >
                      <input
                        type="checkbox"
                        checked={!!callConfirmedMap[r.id]}
                        onChange={(e) => setCallConfirmedMap({ ...callConfirmedMap, [r.id]: e.target.checked })}
                        style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        I have called & confirmed rates with the homeowner
                      </span>
                    </motion.label>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReject(r)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)', gap: '4px', borderColor: 'rgba(239,68,68,0.2)' }}
                      >
                        <X size={14} /> Reject
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: callConfirmedMap[r.id] ? 1.04 : 1, y: callConfirmedMap[r.id] ? -1 : 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAccept(r)}
                        className="btn btn-primary btn-sm"
                        disabled={!callConfirmedMap[r.id]}
                        style={{ gap: '4px' }}
                      >
                        <Check size={14} /> Accept Booking
                      </motion.button>
                    </div>
                  </div>

                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

      </div>
    </WorkerLayout>
  )
}

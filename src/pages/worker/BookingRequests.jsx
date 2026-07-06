import React, { useEffect, useState } from 'react'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { getWorkerBookings, updateBookingStatus, confirmBookingCall } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { updateWorkerGPSLocation } from '../../services/workers'
import { formatDate, formatTime } from '../../utils/helpers'
import { Phone, Check, X, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'

export default function BookingRequests() {
  const { worker } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

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
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Booking Requests</h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : requests.length === 0 ? (
          <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <AlertCircle size={36} color="var(--text-muted)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Pending Requests</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Homeowner service request invites will show up here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {requests.map(r => (
              <div key={r.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{r.homeowners?.full_name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Requested: {formatDate(r.service_date)} at {formatTime(r.service_time)}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      📍 <strong>Address:</strong> {r.address}
                    </p>
                    {r.notes && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', marginTop: '0.5rem' }}>
                        📝 <strong>Notes:</strong> {r.notes}
                      </p>
                    )}
                  </div>

                  <button onClick={() => handleCall(r)} className="btn btn-secondary" style={{ gap: '6px' }}>
                    <Phone size={16} /> Call Home Owner
                  </button>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  {/* Call confirmation checkbox */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="checkbox" 
                      checked={!!callConfirmedMap[r.id]} 
                      onChange={(e) => setCallConfirmedMap({ ...callConfirmedMap, [r.id]: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      I have called & confirmed rates with the homeowner
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleReject(r)} 
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)', gap: '4px' }}
                    >
                      <X size={14} /> Reject
                    </button>
                    <button 
                      onClick={() => handleAccept(r)} 
                      className="btn btn-primary btn-sm"
                      disabled={!callConfirmedMap[r.id]}
                      style={{ gap: '4px' }}
                    >
                      <Check size={14} /> Accept Booking
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </WorkerLayout>
  )
}

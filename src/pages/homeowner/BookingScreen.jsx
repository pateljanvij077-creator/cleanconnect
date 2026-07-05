import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getWorkerById } from '../../services/workers'
import { createBooking } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency } from '../../utils/helpers'
import { ArrowLeft, Calendar, Clock, MapPin, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function BookingScreen() {
  const { workerId } = useParams()
  const navigate = useNavigate()
  const { homeowner } = useAuth()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)

  // Form states
  const [isImmediate, setIsImmediate] = useState(false)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [showQrModal, setShowQrModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getWorkerById(workerId)
      .then(setWorker)
      .catch(err => {
        console.error(err)
        toast.error('Failed to retrieve cleaner details')
      })
      .finally(() => setLoading(false))

    if (homeowner) {
      setAddress(homeowner.address || '')
    }
  }, [workerId, homeowner])

  if (loading) {
    return (
      <HomeOwnerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div className="spinner" />
        </div>
      </HomeOwnerLayout>
    )
  }

  const timeSlots = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    let finalDate = bookingDate
    let finalTime = `${bookingTime}:00`

    if (isImmediate) {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      finalDate = `${year}-${month}-${day}`
      
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      finalTime = `${hours}:${minutes}:00`
    } else {
      if (!bookingDate) {
        toast.error('Select a booking date')
        return
      }
    }

    if (!address) {
      toast.error('Please enter delivery address')
      return
    }

    setSubmitting(true)
    try {
      // 1. Create booking entry in Supabase database
      const booking = await createBooking({
        homeowner_id: homeowner.id,
        worker_id: worker.id,
        service_date: finalDate,
        service_time: finalTime,
        notes,
        address,
        total_price: worker.pricing_per_hour * 2, // Assuming 2 hours default
        payment_method: paymentMethod,
        status: 'pending',
        latitude: homeowner?.latitude || null,
        longitude: homeowner?.longitude || null
      })

      // 2. Alert worker via in-app notifications system
      await createNotification(
        worker.user_id,
        'New Booking Request!',
        `${homeowner.full_name} requested your service ${isImmediate ? 'RIGHT NOW' : `on ${finalDate} at ${finalTime}`}`,
        'booking',
        { bookingId: booking.id }
      )

      toast.success('Booking requested successfully!')
      navigate('/homeowner/bookings')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to place booking request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <HomeOwnerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm" style={{ width: 'fit-content', gap: '4px' }}>
          <ArrowLeft size={16} /> Cancel
        </button>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Schedule Cleaner</h2>

        {/* Worker quick card header */}
        {worker && (
          <div className="card glass" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem' }}>
            {worker.avatar_url && (
              <img src={worker.avatar_url} alt={worker.full_name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{worker.full_name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Rate: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(worker.pricing_per_hour)}/hr</span>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">When do you need the service?</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label className="card glass flex-center" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer', border: !isImmediate ? '2px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                <input 
                  type="radio" 
                  name="bookingTiming" 
                  checked={!isImmediate} 
                  onChange={() => setIsImmediate(false)}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>📅 Schedule for later</span>
              </label>

              <label className="card glass flex-center" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer', border: isImmediate ? '2px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                <input 
                  type="radio" 
                  name="bookingTiming" 
                  checked={isImmediate} 
                  onChange={() => setIsImmediate(true)}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>⚡ Book Right Now</span>
              </label>
            </div>
          </div>

          {!isImmediate && (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Service Date</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    className="form-input" 
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required={!isImmediate}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Preferred Time Slot</label>
                <select className="form-select" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}>
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Service Address</label>
            <textarea 
              className="form-input" 
              rows={2} 
              placeholder="Confirm house number, block, society name..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Work Description / Notes (Optional)</label>
            <textarea 
              className="form-input" 
              rows={2} 
              placeholder="e.g. Deep cleaning of kitchen and balcony, dusting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Payments Select System */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Payment Method</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label className="card glass flex-center" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer', border: paymentMethod === 'cash' ? '2px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                <input 
                  type="radio" 
                  name="payMethod" 
                  checked={paymentMethod === 'cash'} 
                  onChange={() => setPaymentMethod('cash')}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>💵 Cash on Service</span>
              </label>

              <label className="card glass flex-center" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer', border: paymentMethod === 'upi' ? '2px solid var(--primary)' : '1px solid var(--border-glass)' }}>
                <input 
                  type="radio" 
                  name="payMethod" 
                  checked={paymentMethod === 'upi'} 
                  onChange={() => setPaymentMethod('upi')}
                  style={{ marginRight: '6px' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>📱 UPI Scanner QR</span>
              </label>
            </div>
          </div>

          {/* Show QR code if UPI selected */}
          {paymentMethod === 'upi' && worker?.upi_qr_url && (
            <button 
              type="button" 
              onClick={() => setShowQrModal(true)} 
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px', alignSelf: 'flex-start' }}
            >
              <QrCode size={16} /> View Worker's UPI QR Code
            </button>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Send Booking Request'}
          </button>
        </form>

        {/* QR Code preview Modal */}
        {showQrModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1.5rem', backdropFilter: 'blur(8px)'
          }} onClick={() => setShowQrModal(false)}>
            <div className="card glass slide-up" style={{ maxWidth: '360px', width: '100%', textAlign: 'center', gap: '1rem' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Cleaner's UPI Code</h3>
              <img src={worker?.upi_qr_url} alt="UPI QR" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Scan and transfer direct to Ramesh Kumar. Confirm payments after cleaner starts job.
              </p>
              <button onClick={() => setShowQrModal(false)} className="btn btn-primary btn-sm">Close</button>
            </div>
          </div>
        )}

      </div>
    </HomeOwnerLayout>
  )
}

import React, { useEffect, useState } from 'react'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getHomeownerBookings, updateBookingStatus, createReview } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, formatTime, getStatusClass } from '../../utils/helpers'
import { Star, MessageCircle, AlertCircle, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function BookingHistory() {
  const { homeowner } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Review modal state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const fetchBookings = useEffect(() => {
    if (homeowner) {
      getHomeownerBookings(homeowner.id)
        .then(setBookings)
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [homeowner])

  const handleCancelBooking = async (booking) => {
    const confirm = window.confirm('Are you sure you want to cancel this booking request?')
    if (!confirm) return

    try {
      await updateBookingStatus(booking.id, 'cancelled', { cancelled_by: 'homeowner' })
      toast.success('Booking cancelled successfully')
      
      // Notify cleaner
      await createNotification(
        booking.workers.user_id,
        'Booking Cancelled',
        `${homeowner.full_name} has cancelled the booking for ${formatDate(booking.service_date)}`,
        'booking',
        { bookingId: booking.id }
      )
      
      // Refresh list
      const updated = bookings.map(b => b.id === booking.id ? { ...b, status: 'cancelled', cancelled_by: 'homeowner' } : b)
      setBookings(updated)
    } catch (err) {
      toast.error('Failed to cancel booking')
    }
  }

  const openReviewModal = (booking) => {
    setSelectedBooking(booking)
    setRating(5)
    setComment('')
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!selectedBooking) return

    setSubmittingReview(true)
    try {
      await createReview({
        booking_id: selectedBooking.id,
        homeowner_id: homeowner.id,
        worker_id: selectedBooking.worker_id,
        rating,
        comment
      })

      // Update status to mark that payment/review complete
      await updateBookingStatus(selectedBooking.id, 'completed', { payment_status: 'paid' })

      toast.success('Thank you for rating your service!')
      
      // Refresh feed
      const updated = bookings.map(b => b.id === selectedBooking.id ? { ...b, status: 'completed', payment_status: 'paid' } : b)
      setBookings(updated)
      
      setSelectedBooking(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit rating review')
    } finally {
      setSubmittingReview(false)
    }
  }

  return (
    <HomeOwnerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Booking History</h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <AlertCircle size={36} color="var(--text-muted)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No Bookings Yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Your cleaning scheduling requests will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bookings.map(b => (
              <div key={b.id} className="card glass" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {b.workers?.avatar_url && (
                  <img src={b.workers.avatar_url} alt={b.workers.full_name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
                )}
                
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{b.workers?.full_name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {formatDate(b.service_date)} at {formatTime(b.service_time)}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Payment: <span style={{ textTransform: 'capitalize' }}>{b.payment_method}</span> ({b.payment_status})
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${getStatusClass(b.status)}`}>
                    {b.status}
                  </span>

                  {b.status === 'pending' && (
                    <button onClick={() => handleCancelBooking(b)} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }}>
                      Cancel
                    </button>
                  )}

                  {b.status === 'completed' && b.payment_status === 'pending' && (
                    <button onClick={() => openReviewModal(b)} className="btn btn-primary btn-sm">
                      Rate Cleaner
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Modal dialog */}
        {selectedBooking && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1.5rem', backdropFilter: 'blur(8px)'
          }}>
            <div className="card glass slide-up" style={{ maxWidth: '440px', width: '100%', gap: '1.25rem' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Rate Cleaning Service</h3>
                <button onClick={() => setSelectedBooking(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  How was your experience with <strong>{selectedBooking.workers?.full_name}</strong>?
                </p>

                {/* Rating selection (1-5 stars) */}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Star 
                        size={32} 
                        color="#f59e0b" 
                        fill={star <= rating ? '#f59e0b' : 'transparent'} 
                      />
                    </button>
                  ))}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Review Comment</label>
                  <textarea 
                    className="form-input" 
                    rows={3} 
                    placeholder="Tell other homeowners about their work quality..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submittingReview}>
                  {submittingReview ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Submit Rating & Close'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </HomeOwnerLayout>
  )
}

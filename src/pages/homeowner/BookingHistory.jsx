import React, { useEffect, useState, useRef } from 'react'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getHomeownerBookings, updateBookingStatus, createReview, saveHashedCode, getActiveCode } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, formatTime, getStatusClass } from '../../utils/helpers'
import { Star, MessageCircle, AlertCircle, X, Clock, RefreshCw, Copy, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../supabase/client'

const generateSecureCode = () => {
  const array = new Uint32Array(1)
  window.crypto.getRandomValues(array)
  return String(array[0] % 1000000).padStart(6, '0')
}

const hashSHA256 = async (text) => {
  const msgBuffer = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const formatTimeLeft = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function VerificationCodeCard({ bookingId, activeCode, onRegenerate }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  useEffect(() => {
    if (!activeCode) return

    const calculateTimeLeft = () => {
      return Math.max(0, Math.floor((activeCode.expiry - Date.now()) / 1000))
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeCode])

  if (!activeCode) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Code copied to clipboard!')
  }

  const handleRegenerateClick = async () => {
    setIsRegenerating(true)
    await onRegenerate()
    setIsRegenerating(false)
  }

  const isExpired = timeLeft <= 0

  return (
    <div className="card glass fade-in" style={{
      borderLeft: '4px solid var(--primary)',
      padding: '1.25rem',
      marginTop: '-0.5rem',
      marginBottom: '0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isExpired ? 'var(--danger)' : '#22c55e',
              display: 'inline-block'
            }} />
            {activeCode.type === 'start' ? 'Check-in Security Code' : 'Check-out Security Code'}
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            {activeCode.type === 'start' 
              ? 'Provide this code to the cleaner to start the service.' 
              : 'Provide this code to the cleaner to complete the service.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: isExpired ? 'var(--danger)' : 'var(--text-secondary)' }}>
          <Clock size={16} />
          {isExpired ? 'Expired' : formatTimeLeft(timeLeft)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {isExpired ? (
          // M1: Hide stale digits when the code has expired — show a clear prompt instead
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(239, 68, 68, 0.08)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            Code expired — tap Regenerate to get a new one
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '0.15em',
              color: 'var(--primary)'
            }}>
              {activeCode.code}
            </span>
            <button 
              onClick={handleCopy}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-secondary)', 
                cursor: 'pointer', 
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Copy Code"
            >
              {copied ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
            </button>
          </div>
        )}

        <button 
          onClick={handleRegenerateClick} 
          className="btn btn-secondary btn-sm"
          disabled={isRegenerating}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8rem'
          }}
        >
          <RefreshCw size={14} style={{ transition: 'transform 0.5s ease' }} />
          {isExpired ? 'Regenerate Code' : 'Regenerate'}
        </button>
      </div>
    </div>
  )
}

export default function BookingHistory() {
  const { homeowner } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  // Review modal state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Code generation state
  const [activeCodes, setActiveCodes] = useState({})
  const activeCodesRef = useRef({})
  const generatingRef = useRef({})

  // Update ref when state changes to avoid stale closures in checkAndGenerateCodes
  useEffect(() => {
    activeCodesRef.current = activeCodes
  }, [activeCodes])

  // Load active code metadata from localStorage.
  // SECURITY: Only { type, expiry } is persisted — the plain code is NEVER stored.
  useEffect(() => {
    if (homeowner) {
      const stored = localStorage.getItem(`active_codes_${homeowner.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          const now = Date.now()
          const filtered = {}
          Object.keys(parsed).forEach(bookingId => {
            const entry = parsed[bookingId]
            // Strip any legacy plain-code fields that may have been stored before this fix
            if (entry && entry.expiry > now) {
              filtered[bookingId] = { type: entry.type, expiry: entry.expiry }
            }
          })
          setActiveCodes(filtered)
        } catch (e) {
          console.error('Error parsing active codes from localStorage', e)
        }
      }
    }
  }, [homeowner])

  const fetchBookings = () => {
    if (homeowner) {
      getHomeownerBookings(homeowner.id)
        .then(data => {
          setBookings(data)
          checkAndGenerateCodes(data)
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [homeowner])

  // Realtime subscription for public:bookings
  useEffect(() => {
    if (!homeowner) return

    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `homeowner_id=eq.${homeowner.id}` },
        () => {
          fetchBookings()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [homeowner])

  const handleGenerateCode = async (bookingId, codeType) => {
    try {
      const code = generateSecureCode()
      const hashed = await hashSHA256(code)
      await saveHashedCode(bookingId, hashed, codeType)
      
      const expiry = Date.now() + 10 * 60 * 1000 // 10 minutes
      
      setActiveCodes(prev => {
        // SECURITY: Only { type, expiry } is persisted to localStorage.
        // The plain `code` lives in React state (memory) only and is never written to storage.
        const metadataOnly = { type: codeType, expiry }
        const updatedMeta = { ...prev }
        Object.keys(updatedMeta).forEach(k => {
          updatedMeta[k] = { type: updatedMeta[k].type, expiry: updatedMeta[k].expiry }
        })
        updatedMeta[bookingId] = metadataOnly
        if (homeowner) {
          localStorage.setItem(`active_codes_${homeowner.id}`, JSON.stringify(updatedMeta))
        }
        // In-memory state retains the plain code for display
        return {
          ...prev,
          [bookingId]: { code, type: codeType, expiry }
        }
      })
      toast.success(`${codeType === 'start' ? 'Start' : 'Finish'} Code generated!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate security code')
    }
  }

  const checkAndGenerateCodes = async (currentBookings) => {
    let stateChanged = false
    const updatedCodes = { ...activeCodesRef.current }

    for (const b of currentBookings) {
      if (b.status === 'arrived' || b.status === 'finishing') {
        const codeType = b.status === 'arrived' ? 'start' : 'finish'
        
        // Skip if a generation is already in-flight for this booking
        if (generatingRef.current[b.id]) {
          continue
        }
        
        const localCode = activeCodesRef.current[b.id]
        const hasValidLocalCode = localCode && localCode.type === codeType && localCode.expiry > Date.now()
        
        if (hasValidLocalCode) {
          // Verify the DB record still exists (cleaner may have verified, deleting it).
          // Only skip regeneration when the DB code is confirmed to exist.
          try {
            generatingRef.current[b.id] = true
            const dbCode = await getActiveCode(b.id, codeType)
            if (!dbCode) {
              // I3 fix: Do NOT touch updatedCodes/stateChanged here.
              // handleGenerateCode calls setActiveCodes internally with the fresh code.
              // Calling setActiveCodes(updatedCodes) afterwards with the key absent would race
              // against that update and reinstate the stale entry.
              await handleGenerateCode(b.id, codeType)
            }
            // DB code still valid — nothing to do, keep displaying the current code
          } catch (err) {
            console.error('Error checking active code in DB:', err)
          } finally {
            delete generatingRef.current[b.id]
          }
        } else {
          // No valid local code — generate a new one
          try {
            generatingRef.current[b.id] = true
            await handleGenerateCode(b.id, codeType)
          } catch (err) {
            console.error('Error generating new code:', err)
          } finally {
            delete generatingRef.current[b.id]
          }
        }
      } else {
        // Booking is no longer in a code-required state — evict from local state
        if (updatedCodes[b.id]) {
          delete updatedCodes[b.id]
          stateChanged = true
        }
      }
    }

    if (stateChanged) {
      // Persist only { type, expiry } — never the plain code
      const metadataOnly = {}
      Object.keys(updatedCodes).forEach(k => {
        metadataOnly[k] = { type: updatedCodes[k].type, expiry: updatedCodes[k].expiry }
      })
      setActiveCodes(updatedCodes)
      if (homeowner) {
        localStorage.setItem(`active_codes_${homeowner.id}`, JSON.stringify(metadataOnly))
      }
    }
  }

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
            {bookings.map(b => {
              const codeType = b.status === 'arrived' ? 'start' : (b.status === 'finishing' ? 'finish' : null)
              const activeCode = codeType ? activeCodes[b.id] : null

              return (
                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="card glass" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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

                  {activeCode && (
                    <VerificationCodeCard
                      bookingId={b.id}
                      activeCode={activeCode}
                      onRegenerate={() => handleGenerateCode(b.id, codeType)}
                    />
                  )}
                </div>
              )
            })}
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

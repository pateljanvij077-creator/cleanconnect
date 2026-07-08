import React, { useEffect, useState, useRef } from 'react'
import HomeOwnerLayout from '../../components/layout/HomeOwnerLayout'
import { getHomeownerBookings, updateBookingStatus, createReview, saveHashedCode, getActiveCode } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, formatTime, getStatusClass, formatCurrency } from '../../utils/helpers'
import { Star, MessageCircle, AlertCircle, X, Clock, RefreshCw, Copy, Check, History, Phone, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '../../supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import JobRouteMap from '../../components/maps/JobRouteMap'

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

    timeLeft === 0 && setTimeLeft(calculateTimeLeft())

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
  const { homeowner, user, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  // Review modal state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Code generation state
  const [activeCodes, setActiveCodes] = useState({})
  const [showMapMap, setShowMapMap] = useState({}) // keyed by booking ID
  const activeCodesRef = useRef({})
  const generatingRef = useRef({})

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'all') return true
    if (activeTab === 'active') return ['pending', 'accepted', 'arrived', 'finishing'].includes(b.status)
    if (activeTab === 'completed') return b.status === 'completed'
    if (activeTab === 'cancelled') return b.status === 'cancelled'
    return true
  })

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
    if (authLoading) return
    if (homeowner && user && homeowner.user_id === user.id) {
      getHomeownerBookings(homeowner.id)
        .then(data => {
          setBookings(data)
          checkAndGenerateCodes(data)
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [homeowner, user, authLoading])

  // Realtime subscription for public:bookings
  useEffect(() => {
    if (authLoading || !homeowner || !user || homeowner.user_id !== user.id) return

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
  }, [homeowner, user, authLoading])

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
    if (authLoading || !homeowner || !user || homeowner.user_id !== user.id) {
      return
    }
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

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ]

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'completed': return '4px solid var(--success)'
      case 'cancelled': return '4px solid var(--danger)'
      case 'pending': return '4px solid var(--warning)'
      default: return '4px solid var(--primary)'
    }
  }

  return (
    <HomeOwnerLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>

        {/* Animated page header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: '12px', color: 'var(--primary)' }}>
            <History size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Booking History</h2>
            {!loading && bookings.length > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {bookings.length} booking{bookings.length !== 1 ? 's' : ''} recorded
              </p>
            )}
          </div>
        </motion.div>

        {/* Animated Segmented Tabs */}
        {!loading && bookings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: '4px',
              borderRadius: '30px',
              border: '1px solid var(--border-glass)',
              position: 'relative',
              gap: '2px',
              width: '100%',
              overflow: 'hidden'
            }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const tabCount = tab.id === 'all' 
                ? bookings.length 
                : tab.id === 'active' 
                  ? bookings.filter(b => ['pending', 'accepted', 'arrived', 'finishing'].includes(b.status)).length
                  : bookings.filter(b => b.status === tab.id).length

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '26px',
                    padding: '10px 8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'color var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    zIndex: 1
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--bg-secondary)',
                        borderRadius: '26px',
                        border: '1px solid var(--border-glass)',
                        boxShadow: 'var(--shadow-sm)',
                        zIndex: -1
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    borderRadius: '10px',
                    background: isActive ? 'var(--primary-light)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 800
                  }}>
                    {tabCount}
                  </span>
                </button>
              )
            })}
          </motion.div>
        )}

        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', padding: '3rem', gap: '1rem' }}
          >
            <div className="spinner" style={{ width: '40px', height: '40px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading bookings...</p>
          </motion.div>
        ) : bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="card glass flex-center"
            style={{ padding: '4rem 2rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AlertCircle size={48} color="var(--text-muted)" />
            </motion.div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Bookings Yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>
              Your cleaning scheduling requests will appear here once you book a cleaner.
            </p>
          </motion.div>
        ) : filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card glass flex-center"
            style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}
          >
            <AlertCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
            <p style={{ fontSize: '0.9rem' }}>No bookings matching the "{activeTab}" filter.</p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {filteredBookings.map((b, idx) => {
                const codeType = b.status === 'arrived' ? 'start' : (b.status === 'finishing' ? 'finish' : null)
                const activeCode = codeType ? activeCodes[b.id] : null
                const isBookingActive = ['pending', 'accepted', 'arrived', 'finishing'].includes(b.status)

                return (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -40, scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 120,
                      damping: 16,
                      delay: idx * 0.05
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                  >
                    <div 
                      className="card glass" 
                      style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        flexWrap: 'wrap', 
                        alignItems: 'center',
                        borderLeft: getStatusBorderColor(b.status),
                        padding: '1.25rem',
                        transition: 'transform var(--transition-fast)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {(b.workers?.selfie_url || b.workers?.avatar_url) && (
                        <motion.img
                          src={b.workers.selfie_url || b.workers.avatar_url}
                          alt={b.workers.full_name}
                          whileHover={{ scale: 1.08 }}
                          style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass)' }}
                        />
                      )}

                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{b.workers?.full_name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Clock size={12} />
                          {formatDate(b.service_date)} • {formatTime(b.service_time)}
                        </p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Fare: <strong style={{ color: 'var(--success)' }}>{formatCurrency(b.total_price)}</strong>
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Payment: <strong style={{ textTransform: 'capitalize' }}>{b.payment_method}</strong> ({b.payment_status})
                          </span>
                        </div>

                        {/* Track Cleaner Map Toggle for active bookings */}
                        {isBookingActive && (
                          <div style={{ marginTop: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowMapMap(prev => ({ ...prev, [b.id]: !prev[b.id] }))
                              }}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '4px 8px', fontSize: '12px', gap: '4px', height: 'auto', minHeight: 'auto', display: 'flex', alignItems: 'center' }}
                            >
                              <MapPin size={12} color="var(--primary)" />
                              {showMapMap[b.id] ? 'Hide Tracking Map' : 'Track Cleaner on Map'}
                            </button>
                            
                            {showMapMap[b.id] && (
                              <JobRouteMap
                                workerLat={b.workers?.latitude}
                                workerLng={b.workers?.longitude}
                                homeownerLat={b.latitude || homeowner?.latitude}
                                homeownerLng={b.longitude || homeowner?.longitude}
                                workerAvatar={b.workers?.selfie_url || b.workers?.avatar_url}
                                homeownerAvatar={homeowner?.avatar_url}
                                homeownerName={homeowner?.full_name}
                                address={b.address}
                              />
                            )}
                          </div>
                        )}

                        {/* Cleaner Call Actions for active bookings */}
                        {isBookingActive && b.workers?.phone && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(`tel:${b.workers.phone}`)
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 10px', height: 'auto', borderRadius: '8px' }}
                              title="Call Cleaner"
                            >
                              <Phone size={13} />
                              <span style={{ fontSize: '11px', fontWeight: 700 }}>Call</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                const cleanPhone = b.workers.phone.replace(/[^0-9]/g, '')
                                const msg = encodeURIComponent(`Hello ${b.workers.full_name}, I am contacting you regarding our booking on CleanConnect.`)
                                window.open(`https://wa.me/91${cleanPhone}?text=${msg}`, '_blank')
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 10px', height: 'auto', borderRadius: '8px' }}
                              title="Chat WhatsApp"
                            >
                              <MessageCircle size={13} />
                              <span style={{ fontSize: '11px', fontWeight: 700 }}>WhatsApp</span>
                            </motion.button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge ${getStatusClass(b.status)}`} style={{ fontWeight: 800 }}>
                          {b.status}
                        </span>

                        {b.status === 'pending' && (
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCancelBooking(b)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--danger)' }}
                          >
                            Cancel
                          </motion.button>
                        )}

                        {b.status === 'completed' && b.payment_status === 'pending' && (
                          <motion.button
                            whileHover={{ scale: 1.04, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => openReviewModal(b)}
                            className="btn btn-primary btn-sm"
                          >
                            Rate Cleaner
                          </motion.button>
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
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Review Modal with AnimatePresence */}
        <AnimatePresence>
          {selectedBooking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 100, padding: '1.5rem', backdropFilter: 'blur(8px)'
              }}
              onClick={() => setSelectedBooking(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="card glass"
                style={{ maxWidth: '440px', width: '100%', gap: '1.25rem' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Rate Cleaning Service</h3>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    onClick={() => setSelectedBooking(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </motion.button>
                </div>

                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    How was your experience with <strong>{selectedBooking.workers?.full_name}</strong>?
                  </p>

                  {/* Animated star rating */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.5rem 0' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <motion.button
                        key={star}
                        type="button"
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                      >
                        <Star
                          size={32}
                          color="#f59e0b"
                          fill={star <= rating ? '#f59e0b' : 'transparent'}
                        />
                      </motion.button>
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

                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={submittingReview}
                  >
                    {submittingReview ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Submit Rating & Close'}
                  </motion.button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </HomeOwnerLayout>
  )
}

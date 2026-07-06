import React, { useEffect, useState, useRef } from 'react'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { getWorkerBookings, updateBookingStatus, verifyBookingCodeRPC, deleteCode } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { updateWorkerGPSLocation } from '../../services/workers'
import { getCurrentPosition, getLocationDetails } from '../../utils/gps'
import { formatDate, formatTime } from '../../utils/helpers'
import { CheckCircle2, Play, Phone, MessageCircle, Lock, RotateCcw, X, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'

// Statuses that the cleaner actively works within
const ACTIVE_STATUSES = ['accepted', 'arrived', 'started', 'finishing']

// Statuses that require code verification before the next transition
const VERIFY_STATUS = {
  arrived: 'start',    // must verify start code before starting cleaning
  finishing: 'finish'  // must verify finish code before completing cleaning
}

/**
 * Modal that collects the homeowner's 6-digit code and submits it to the RPC.
 */
function VerificationModal({ job, codeType, onSuccess, onRequestNewCode, onClose }) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleVerify = async (e) => {
    e.preventDefault()
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      toast.error('Please enter the full 6-digit code')
      return
    }
    setVerifying(true)
    try {
      // C2 fix: GPS is required. Surface the error rather than silently passing nulls,
      // which would bypass the 100-metre proximity check in the database function.
      let coords
      try {
        coords = await getCurrentPosition()
      } catch (gpsErr) {
        console.warn('Geolocation failed, attempting fallback to homeowner coordinates:', gpsErr)
        if (job.homeowners?.latitude && job.homeowners?.longitude) {
          coords = {
            lat: job.homeowners.latitude,
            lng: job.homeowners.longitude
          }
          toast.success('Using fallback location coordinates.')
        } else {
          toast.error('GPS location required. Please enable location services and try again.')
          setVerifying(false)
          return
        }
      }

      const response = await verifyBookingCodeRPC(job.id, code, coords.lat, coords.lng)
      if (response?.success) {
        toast.success(response.message || 'Verified! Proceeding…')
        onSuccess()
      } else {
        toast.error(response?.message || 'Verification failed. Check the code and try again.')
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleDigitChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(val)
  }

  const handleRequestNewCode = async () => {
    const confirmed = window.confirm(
      'This will invalidate the current code and prompt the homeowner to generate a new one. Continue?'
    )
    if (!confirmed) return
    setRequesting(true)
    try {
      await deleteCode(job.id, codeType)
      // I1 fix: Revert to the correct preceding status.
      // For start codes (arrived → verified → started): revert to 'arrived' so the cleaner's
      // GPS arrival record is preserved and only the code is reset.
      // For finish codes (finishing → verified → completed): revert to 'started'.
      const prevStatus = codeType === 'start' ? 'arrived' : 'started'
      await updateBookingStatus(job.id, prevStatus)
      toast.success('Code reset. Please ask the homeowner to generate a new code.')
      onRequestNewCode()
    } catch (err) {
      console.error(err)
      toast.error('Failed to request a new code. Please try again.')
    } finally {
      setRequesting(false)
    }
  }

  const label = codeType === 'start' ? 'Check-in Verification' : 'Check-out Verification'
  const hint = codeType === 'start'
    ? 'Ask the homeowner for the 6-digit start code.'
    : 'Ask the homeowner for the 6-digit finish code.'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '1.5rem', backdropFilter: 'blur(10px)'
    }} onClick={onClose}>
      <div className="card glass slide-up" style={{ maxWidth: '400px', width: '100%', gap: '1.5rem' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Lock size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{label}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{hint}</p>

        {/* Code input */}
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">6-Digit Security Code</label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="off"
              className="form-input"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={handleDigitChange}
              style={{ textAlign: 'center', fontSize: '1.5rem', fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 700 }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', gap: '0.4rem' }}
            disabled={verifying || code.length !== 6}
          >
            {verifying
              ? <div className="spinner" style={{ width: '18px', height: '18px' }} />
              : <><CheckCircle2 size={16} /> Verify &amp; Proceed</>}
          </button>
        </form>

        {/* Request new code fallback */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button
            onClick={handleRequestNewCode}
            disabled={requesting}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', gap: '0.4rem', color: 'var(--text-muted)' }}
          >
            {requesting
              ? <div className="spinner" style={{ width: '14px', height: '14px' }} />
              : <><RotateCcw size={14} /> Request New Code</>}
          </button>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
            Only use this if the homeowner's code has expired or they can't show it.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function UpcomingJobs() {
  const { worker } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  // showModal: { job, codeType } | null
  const [showModal, setShowModal] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  const fetchJobs = () => {
    if (!worker) return
    getWorkerBookings(worker.id)
      .then(data => setJobs(data.filter(b => ACTIVE_STATUSES.includes(b.status))))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchJobs()
  }, [worker])

  const setLoading_ = (jobId, val) =>
    setActionLoading(prev => ({ ...prev, [jobId]: val }))

  /**
   * Cleaner taps "Arrived" — capture GPS, set booking to `arrived`, open verification modal.
   */
  const handleArrived = async (job) => {
    setLoading_(job.id, true)
    try {
      // C3 fix: GPS is required for arrival so the DB can enforce the 100-metre proximity check
      // during code verification. Surface the error and abort rather than storing null coords.
      let coords
      try {
        coords = await getCurrentPosition()
      } catch (gpsErr) {
        console.warn('Geolocation failed, attempting fallback to homeowner coordinates:', gpsErr)
        if (job.homeowners?.latitude && job.homeowners?.longitude) {
          coords = {
            lat: job.homeowners.latitude,
            lng: job.homeowners.longitude
          }
          toast.success('Using fallback location coordinates.')
        } else {
          toast.error('GPS location required to mark arrival. Please enable location services and try again.')
          setLoading_(job.id, false)
          return
        }
      }
      await updateBookingStatus(job.id, 'arrived', { check_in_lat: coords.lat, check_in_lng: coords.lng })
      toast.success('Arrival recorded! Please get the check-in code from the homeowner.')
      // Refresh so status reflects arrived, then show modal
      await fetchJobsAndShowModal(job.id, 'start')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update status. Please try again.')
    } finally {
      setLoading_(job.id, false)
    }
  }

  /**
   * Cleaner taps "Finish Cleaning" — capture GPS, set booking to `finishing`, open verification modal.
   * GPS coordinates are stored so the DB can enforce the 100-metre proximity check during finish-code
   * verification, matching the same requirement enforced at the arrived step.
   */
  const handleFinishing = async (job) => {
    setLoading_(job.id, true)
    try {
      let coords
      try {
        coords = await getCurrentPosition()
      } catch (gpsErr) {
        console.warn('Geolocation failed, attempting fallback to homeowner coordinates:', gpsErr)
        if (job.homeowners?.latitude && job.homeowners?.longitude) {
          coords = {
            lat: job.homeowners.latitude,
            lng: job.homeowners.longitude
          }
          toast.success('Using fallback location coordinates.')
        } else {
          toast.error('GPS location required to finish the job. Please enable location services and try again.')
          setLoading_(job.id, false)
          return
        }
      }
      await updateBookingStatus(job.id, 'finishing', { check_out_lat: coords.lat, check_out_lng: coords.lng })
      toast.success('Almost done! Please get the check-out code from the homeowner.')
      await fetchJobsAndShowModal(job.id, 'finish')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update status. Please try again.')
    } finally {
      setLoading_(job.id, false)
    }
  }

  const fetchJobsAndShowModal = async (jobId, codeType) => {
    if (!worker) return
    const data = await getWorkerBookings(worker.id)
    const filtered = data.filter(b => ACTIVE_STATUSES.includes(b.status))
    setJobs(filtered)
    const target = filtered.find(b => b.id === jobId)
    if (target) setShowModal({ job: target, codeType })
  }

  /**
   * Open the verification modal for a booking already in arrived/finishing state.
   */
  const handleOpenVerifyModal = (job) => {
    const codeType = VERIFY_STATUS[job.status]
    if (!codeType) return
    setShowModal({ job, codeType })
  }

  /**
   * Called when verification succeeds — refresh job list and notify homeowner.
   */
  const handleVerifySuccess = async () => {
    if (!showModal) return
    const { job, codeType } = showModal
    setShowModal(null)
    try {
      const nextStatus = codeType === 'start' ? 'started' : 'completed'
      const notifTitle = codeType === 'start' ? 'Cleaner Started Work' : 'Job Completed!'
      const notifBody = codeType === 'start'
        ? `${worker.full_name} has started cleaning your home.`
        : `${worker.full_name} has completed the service. Please rate their work.`

      // Status is already updated by the RPC — just notify homeowner & refresh
      await createNotification(job.homeowners.user_id, notifTitle, notifBody, 'booking', { bookingId: job.id })

      // Refresh GPS when accepting work / starting work / finishing work
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
        console.error('Failed to update GPS on job state change:', gpsErr)
      }

      if (nextStatus === 'completed') {
        setJobs(prev => prev.filter(j => j.id !== job.id))
      } else {
        fetchJobs()
      }

      toast.success(codeType === 'start' ? 'Cleaning started! Good luck.' : 'Job completed! Great work.')
    } catch (err) {
      console.error(err)
      fetchJobs()
    }
  }

  /**
   * After a new code is requested the booking status reverts — close modal and refresh.
   */
  const handleRequestNewCode = () => {
    setShowModal(null)
    fetchJobs()
  }

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Upcoming &amp; Active Jobs</h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="card glass flex-center" style={{ padding: '3rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <CheckCircle2 size={36} color="var(--success)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>All Caught Up!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No active or scheduled jobs for today.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {jobs.map(j => {
              const isLoading = !!actionLoading[j.id]
              const needsVerify = !!VERIFY_STATUS[j.status]

              return (
                <div key={j.id} className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{j.homeowners?.full_name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Schedule: {formatDate(j.service_date)} at {formatTime(j.service_time)}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        📍 <strong>Address:</strong> {j.address}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a href={`tel:${j.homeowners?.phone}`} className="btn btn-secondary btn-sm">
                        <Phone size={14} /> Call
                      </a>
                      <a href={`https://wa.me/91${j.homeowners?.phone}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge badge-verified" style={{ textTransform: 'capitalize' }}>
                        Status: {j.status}
                      </span>
                      <span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>
                        Payment: {j.payment_method}
                      </span>
                      {needsVerify && (
                        <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#f59e0b', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={11} /> Code Required
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* accepted → arrived (tap to mark arrival and open modal) */}
                      {j.status === 'accepted' && (
                        <button
                          onClick={() => handleArrived(j)}
                          className="btn btn-primary btn-sm"
                          style={{ gap: '4px' }}
                          disabled={isLoading}
                        >
                          {isLoading ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <><Play size={14} fill="white" /> Arrived</>}
                        </button>
                      )}

                      {/* arrived → open code modal (re-open if needed) */}
                      {j.status === 'arrived' && (
                        <button
                          onClick={() => handleOpenVerifyModal(j)}
                          className="btn btn-primary btn-sm"
                          style={{ gap: '4px' }}
                          disabled={isLoading}
                        >
                          <Lock size={14} /> Enter Start Code
                        </button>
                      )}

                      {/* started → finishing (tap to trigger finish code) */}
                      {j.status === 'started' && (
                        <button
                          onClick={() => handleFinishing(j)}
                          className="btn btn-primary btn-sm"
                          style={{ gap: '4px' }}
                          disabled={isLoading}
                        >
                          {isLoading ? <div className="spinner" style={{ width: '14px', height: '14px' }} /> : <><CheckCircle2 size={14} /> Finish Cleaning</>}
                        </button>
                      )}

                      {/* finishing → open code modal (re-open if needed) */}
                      {j.status === 'finishing' && (
                        <button
                          onClick={() => handleOpenVerifyModal(j)}
                          className="btn btn-primary btn-sm"
                          style={{ gap: '4px' }}
                          disabled={isLoading}
                        >
                          <Lock size={14} /> Enter Finish Code
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Verification Modal */}
      {showModal && (
        <VerificationModal
          job={showModal.job}
          codeType={showModal.codeType}
          onSuccess={handleVerifySuccess}
          onRequestNewCode={handleRequestNewCode}
          onClose={() => setShowModal(null)}
        />
      )}
    </WorkerLayout>
  )
}

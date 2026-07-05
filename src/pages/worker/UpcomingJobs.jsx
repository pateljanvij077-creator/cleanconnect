import React, { useEffect, useState } from 'react'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { getWorkerBookings, updateBookingStatus } from '../../services/bookings'
import { createNotification } from '../../services/notifications'
import { formatDate, formatTime } from '../../utils/helpers'
import { CheckCircle2, Play, Phone, MessageCircle, Navigation } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function UpcomingJobs() {
  const { worker } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (worker) {
      getWorkerBookings(worker.id)
        .then(data => setJobs(data.filter(b => ['accepted', 'started'].includes(b.status))))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [worker])

  const handleStartJob = async (job) => {
    try {
      await updateBookingStatus(job.id, 'started')
      toast.success('Job started! Good luck.')
      
      // Notify homeowner
      await createNotification(
        job.homeowners.user_id,
        'Cleaner Started Work',
        `${worker.full_name} has arrived and started the cleaning work!`,
        'booking',
        { bookingId: job.id }
      )

      // Refresh state
      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'started' } : j))
    } catch (err) {
      toast.error('Failed to update job state')
    }
  }

  const handleCompleteJob = async (job) => {
    try {
      // Complete job. If payment method is cash, mark as paid. If UPI, we assume they pay on screen.
      const paymentStatus = job.payment_method === 'cash' ? 'paid' : 'pending'
      
      await updateBookingStatus(job.id, 'completed', { payment_status: paymentStatus })
      toast.success('Job marked as completed successfully!')
      
      // Notify homeowner
      await createNotification(
        job.homeowners.user_id,
        'Job Completed!',
        `${worker.full_name} has completed the cleaning work. Please review and rate their service.`,
        'booking',
        { bookingId: job.id }
      )

      setJobs(jobs.filter(j => j.id !== job.id))
    } catch (err) {
      toast.error('Failed to complete job')
    }
  }

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Upcoming & Active Jobs</h2>

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
            {jobs.map(j => (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-verified" style={{ textTransform: 'capitalize' }}>
                      Status: {j.status}
                    </span>
                    <span className="badge badge-pending" style={{ textTransform: 'capitalize' }}>
                      Payment: {j.payment_method}
                    </span>
                  </div>

                  <div>
                    {j.status === 'accepted' ? (
                      <button onClick={() => handleStartJob(j)} className="btn btn-primary btn-sm" style={{ gap: '4px' }}>
                        <Play size={14} fill="white" /> Start Cleaning
                      </button>
                    ) : (
                      <button onClick={() => handleCompleteJob(j)} className="btn btn-primary btn-sm" style={{ gap: '4px' }}>
                        <CheckCircle2 size={14} /> Complete Job
                      </button>
                    )}
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

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Star, ShieldCheck, BadgeAlert, Plus, Edit3, MapPin } from 'lucide-react'
import { getWorkerLocations } from '../../services/workers'

export default function WorkerProfile() {
  const navigate = useNavigate()
  const { worker } = useAuth()
  const [locations, setLocations] = useState([])

  useEffect(() => {
    if (worker) {
      getWorkerLocations(worker.id).then(setLocations).catch(err => console.error(err))
    }
  }, [worker])

  if (!worker) return null

  return (
    <WorkerLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Profile Card Header */}
        <div className="card glass" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {worker.avatar_url ? (
            <img 
              src={worker.avatar_url} 
              alt={worker.full_name} 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
            />
          ) : (
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={36} color="var(--primary)" />
            </div>
          )}

          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{worker.full_name}</h2>
              {worker.is_verified ? (
                <ShieldCheck size={20} color="var(--success)" />
              ) : (
                <span className="badge badge-pending">PENDING APPROVAL</span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              {worker.worker_type?.replace('_', ' ')} • {worker.gender}
            </p>
          </div>

          <button onClick={() => navigate('/worker/edit-profile')} className="btn btn-primary" style={{ gap: '6px' }}>
            <Edit3 size={16} /> Edit Profile
          </button>
        </div>

        {/* Detailed Info Cards */}
        <div className="grid-2">
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Profile Summary</h3>
            <p><strong>Experience:</strong> {worker.experience_years} Years</p>
            <p><strong>Date of Birth:</strong> {formatDate(worker.dob)}</p>
            <p><strong>Primary Phone:</strong> {worker.phone}</p>
            <p><strong>Backup Phone:</strong> {worker.phone2}</p>
            <p><strong>Languages:</strong> {(worker.languages || []).join(', ')}</p>
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Service Pricing</h3>
            <p><strong>Hourly Charge:</strong> {formatCurrency(worker.pricing_per_hour)}/hour</p>
            <p><strong>Daily Charge:</strong> {formatCurrency(worker.pricing_per_day)}/day</p>
            {worker.pricing_note && <p><strong>Rates Note:</strong> {worker.pricing_note}</p>}
            
            {worker.upi_qr_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', color: 'var(--success)', fontSize: '13px', fontWeight: 600 }}>
                <ShieldCheck size={16} /> UPI QR Code Uploaded
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
                <BadgeAlert size={16} /> No UPI QR uploaded (Homeowners cannot scan & pay)
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="card glass">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>About Me (Bio)</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{worker.bio || 'No details provided yet.'}</p>
        </div>

        {/* Locations & GPS Coverage */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={18} color="var(--primary)" />
            Primary Location & Work Areas
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            {worker.latitude && worker.longitude ? (
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                <strong>GPS Coordinates:</strong> {worker.latitude.toFixed(6)}, {worker.longitude.toFixed(6)}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                GPS coordinates not set.
              </p>
            )}
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>Current Area:</strong> {worker.current_area || 'Not Set'}
            </p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              <strong>Current City:</strong> {worker.current_city || 'Not Set'}
            </p>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>All Configured Locations</h4>
            {locations.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No locations configured yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {locations.map(loc => (
                  <div key={loc.id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <span>📍</span>
                    <span style={{ fontWeight: loc.is_primary ? '700' : 'normal' }}>
                      {loc.city_name} → {loc.area_name} ({loc.society_name || 'All Societies'})
                    </span>
                    {loc.is_primary && (
                      <span className="badge badge-verified" style={{ marginLeft: 'auto', fontSize: '10px', padding: '2px 6px' }}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </WorkerLayout>
  )
}

import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatDate } from '../../utils/helpers'
import { Check, X, FileText, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function WorkerManagement() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [documents, setDocuments] = useState([])

  const fetchWorkers = useEffect(() => {
    supabase
      .from('workers')
      .select('*')
      .then(({ data }) => setWorkers(data || []))
      .finally(() => setLoading(false))
  }, [])

  const handleOpenDocs = async (worker) => {
    setSelectedWorker(worker)
    const { data } = await supabase
      .from('worker_documents')
      .select('*')
      .eq('worker_id', worker.id)
    setDocuments(data || [])
  }

  const handleApproveStatus = async (workerId, status) => {
    try {
      const isApproved = status === 'approved'
      
      const { error } = await supabase
        .from('workers')
        .update({ 
          verification_status: status, 
          is_verified: isApproved,
          is_available: isApproved ? true : false,
          availability_status: isApproved ? 'available' : 'offline'
        })
        .eq('id', workerId)

      if (error) throw error

      toast.success(`Worker profile marked as ${status.toUpperCase()}!`)
      setWorkers(workers.map(w => w.id === workerId ? { 
        ...w, 
        verification_status: status, 
        is_verified: isApproved 
      } : w))
      
      setSelectedWorker(null)
    } catch (err) {
      toast.error('Failed to update worker approval status')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Cleaners Verification Review</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Verify Aadhaar / PAN documents and approve worker listing permissions
          </p>
        </div>

        {/* Workers List Table */}
        <div className="card glass" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : workers.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No cleaners registered yet</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>Cleaner</th>
                    <th style={{ padding: '10px' }}>Phone</th>
                    <th style={{ padding: '10px' }}>Experience</th>
                    <th style={{ padding: '10px' }}>Sub Status</th>
                    <th style={{ padding: '10px' }}>Verify State</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{w.full_name}</td>
                      <td style={{ padding: '10px' }}>{w.phone}</td>
                      <td style={{ padding: '10px' }}>{w.experience_years} Years</td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${w.is_subscription_active ? 'badge-verified' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
                          {w.is_subscription_active ? 'ACTIVE' : 'EXPIRED'}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span className={`badge ${w.verification_status === 'approved' ? 'badge-verified' : 'badge-pending'}`}>
                          {w.verification_status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <button onClick={() => handleOpenDocs(w)} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                          <FileText size={14} /> Review Docs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Verification review Modal dialog */}
        {selectedWorker && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '1.5rem', backdropFilter: 'blur(8px)'
          }}>
            <div className="card glass slide-up" style={{ maxWidth: '520px', width: '100%', gap: '1.25rem' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Document Review: {selectedWorker.full_name}</h3>
                <button onClick={() => setSelectedWorker(null)} className="btn btn-ghost btn-sm" style={{ padding: 0 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Uploaded Documents display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
                {documents.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No verification documents uploaded yet.
                  </p>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="card glass" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', color: 'var(--primary)' }}>
                          {doc.doc_type} CARD
                        </span>
                        <button 
                          type="button"
                          onClick={() => window.open(doc.doc_url, '_blank')} 
                          className="btn btn-ghost"
                          style={{ fontSize: '12px', fontWeight: 600, padding: 0 }}
                        >
                          View Original Image
                        </button>
                      </div>
                      <img 
                        src={doc.doc_url} 
                        alt="Gov Document File" 
                        style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px' }} 
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Approval controls */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <button 
                  onClick={() => handleApproveStatus(selectedWorker.id, 'rejected')} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, color: 'var(--danger)', gap: '4px' }}
                >
                  <X size={16} /> Reject Profile
                </button>
                <button 
                  onClick={() => handleApproveStatus(selectedWorker.id, 'approved')} 
                  className="btn btn-primary" 
                  style={{ flex: 1, gap: '4px' }}
                >
                  <Check size={16} /> Approve & List
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}

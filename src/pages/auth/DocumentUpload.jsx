import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, FileText, CheckCircle2, ShieldAlert } from 'lucide-react'
import { uploadWorkerDocument } from '../../services/workers'
import { getWorkerProfileByUserId } from '../../services/auth'
import { toast } from 'react-hot-toast'

export default function DocumentUpload() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [aadhaarFile, setAadhaarFile] = useState(null)
  const [panFile, setPanFile] = useState(null)
  const [aadhaarNo, setAadhaarNo] = useState('')
  const [panNo, setPanNo] = useState('')

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    if (file) {
      if (type === 'aadhaar') setAadhaarFile(file)
      if (type === 'pan') setPanFile(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!aadhaarFile && !panFile) {
      toast.error('Please upload at least one document: Aadhaar Card or PAN Card')
      return
    }

    if (aadhaarFile && (!aadhaarNo || aadhaarNo.length !== 12)) {
      toast.error('Please enter a valid 12-digit Aadhaar Card number')
      return
    }
    if (aadhaarNo && !aadhaarFile) {
      toast.error('Please choose the Aadhaar Card image to upload')
      return
    }

    if (panFile && (!panNo || panNo.length !== 10)) {
      toast.error('Please enter a valid 10-digit PAN Card number')
      return
    }
    if (panNo && !panFile) {
      toast.error('Please choose the PAN Card image to upload')
      return
    }

    setLoading(true)
    try {
      const storedUserId = localStorage.getItem('cleanconnect_signup_worker_id')
      if (!storedUserId) {
        throw new Error('Worker signup credentials not found. Restart registration.')
      }

      // Fetch worker profile id
      const workerProfile = await getWorkerProfileByUserId(storedUserId)
      if (!workerProfile) throw new Error('Worker profile not found')

      // Upload Aadhaar if present
      if (aadhaarFile && aadhaarNo) {
        await uploadWorkerDocument(workerProfile.id, aadhaarFile, 'aadhaar')
      }

      // Upload PAN if present
      if (panFile && panNo) {
        await uploadWorkerDocument(workerProfile.id, panFile, 'pan')
      }

      toast.success('Verification documents uploaded successfully!')
      
      // Clear temp storage
      localStorage.removeItem('cleanconnect_signup_worker_id')
      
      // Navigate to Dashboard review notification
      navigate('/worker/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'File upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card glass slide-up" style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
          <div style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '12px',
            borderRadius: '16px',
            display: 'flex'
          }}>
            <FileText size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Document Verification</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Upload government documents to get your profile verified & visible to homeowners
          </p>
        </div>

        <div className="card glass" style={{ padding: '0.75rem', background: 'var(--warning-light)', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <ShieldAlert size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Mandatory: Upload Aadhaar Card (12 digits) or PAN Card (10 digits). Admin approval is required before you can appear in search results.
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Aadhaar Upload */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              Aadhaar Card Number (12 digits) {panFile || panNo ? <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Optional)</span> : ''}
            </label>
            <input 
              type="text" 
              maxLength={12}
              className="form-input" 
              placeholder="e.g. 123456789012"
              value={aadhaarNo}
              onChange={(e) => setAadhaarNo(e.target.value.replace(/[^0-9]/g, ''))}
            />
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '4px' }}>
                <FileUp size={14} /> Choose Aadhaar Image
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileChange(e, 'aadhaar')} 
                />
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {aadhaarFile ? aadhaarFile.name : 'No file selected'}
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed var(--border-subtle)' }} />

          {/* PAN Upload */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              PAN Card Number (10 alphanumeric) {aadhaarFile || aadhaarNo ? <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Optional)</span> : ''}
            </label>
            <input 
              type="text" 
              maxLength={10}
              className="form-input" 
              placeholder="e.g. ABCDE1234F"
              value={panNo}
              onChange={(e) => setPanNo(e.target.value.toUpperCase())}
            />
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '4px' }}>
                <FileUp size={14} /> Choose PAN Image
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileChange(e, 'pan')} 
                />
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {panFile ? panFile.name : 'No file selected'}
              </span>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }} /> : 'Upload & Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}

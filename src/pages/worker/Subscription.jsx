import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkerLayout from '../../components/layout/WorkerLayout'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../supabase/client'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { Check, ShieldCheck, CreditCard, Zap, Star, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const planIcons = [Zap, Star, Crown]
const planColors = ['var(--secondary)', 'var(--primary)', '#f59e0b']
const planGlows = [
  'rgba(14,165,233,0.15)',
  'rgba(99,102,241,0.15)',
  'rgba(245,158,11,0.15)'
]

export default function Subscription() {
  const navigate = useNavigate()
  const { worker } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])

  useEffect(() => {
    // Fetch active subscription plans from database
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .then(({ data }) => setPlans(data || []))

    if (worker) {
      // Fetch payment history logs
      supabase
        .from('payments')
        .select('*')
        .eq('worker_id', worker.id)
        .order('payment_date', { ascending: false })
        .then(({ data }) => setPayments(data || []))
        .finally(() => setLoading(false))
    }
  }, [worker])

  const selectPlan = (plan) => {
    // Store selected plan details in state/storage and navigate to payment
    localStorage.setItem('cleanconnect_selected_plan', JSON.stringify(plan))
    navigate('/worker/payment')
  }

  return (
    <WorkerLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Subscription Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Choose a plan to activate search listing and bookings
          </p>
        </motion.div>

        {/* Current status display */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.1 }}
        >
          {worker?.is_subscription_active ? (
            <div
              className="card glass"
              style={{
                borderLeft: '4px solid var(--success)',
                background: 'var(--success-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <ShieldCheck size={32} color="var(--success)" />
              </motion.div>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  ✅ Professional Subscription is ACTIVE
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Listing expires on {formatDate(worker.subscription_expiry)}. Homeowners can find and book your services.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="card glass"
              style={{
                borderLeft: '4px solid var(--danger)',
                background: 'var(--danger-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <ShieldCheck size={32} color="var(--danger)" />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  ⚠️ Subscription Expired
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Select a plan below to activate booking requests and appear in location matching.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Plans Grid with stagger */}
        <div className="grid-4" style={{ marginTop: '0.5rem' }}>
          {plans.map((p, idx) => {
            const PlanIcon = planIcons[idx % planIcons.length]
            const color = planColors[idx % planColors.length]
            const glow = planGlows[idx % planGlows.length]
            const isFeatured = idx === 1

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.15 + idx * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="card glass"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  cursor: 'pointer',
                  border: isFeatured ? `2px solid ${color}` : '1px solid var(--border-glass)',
                  boxShadow: isFeatured ? `0 8px 32px ${glow}` : 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => selectPlan(p)}
              >
                {/* Featured badge */}
                {isFeatured && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '-10px',
                    background: color,
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    padding: '3px 16px 3px 8px',
                    transform: 'rotate(0)',
                    borderRadius: '4px 0 0 4px',
                    boxShadow: `0 2px 8px ${glow}`
                  }}>
                    POPULAR
                  </div>
                )}

                <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    style={{
                      display: 'inline-flex',
                      padding: '12px',
                      borderRadius: '14px',
                      background: glow,
                      marginBottom: '0.75rem'
                    }}
                  >
                    <PlanIcon size={28} color={color} />
                  </motion.div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{p.name}</h4>
                  <h3 style={{ fontSize: '2rem', fontWeight: 900, color, margin: '0.5rem 0' }}>
                    {formatCurrency(p.price)}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 10px', borderRadius: '20px' }}>
                    {p.duration_days} Days
                  </span>
                </div>

                <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', fontSize: '12px', padding: '0.5rem 0' }}>
                  {(p.benefits || []).map((b, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 + i * 0.04 }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
                    >
                      <Check size={14} color="var(--success)" /> {b}
                    </motion.li>
                  ))}
                </ul>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); selectPlan(p) }}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: 'auto', background: isFeatured ? color : undefined }}
                >
                  Activate {p.name}
                </motion.button>
              </motion.div>
            )
          })}
        </div>

        {/* Payment log history */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card glass"
          style={{ marginTop: '1rem' }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={18} color="var(--primary)" /> Billing Log History
          </h3>
          {payments.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No transactions recorded.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Amount</th>
                    <th style={{ padding: '8px' }}>Method</th>
                    <th style={{ padding: '8px' }}>Txn Ref</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((py, idx) => (
                    <motion.tr
                      key={py.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ borderBottom: '1px solid var(--border-glass)' }}
                    >
                      <td style={{ padding: '8px' }}>{formatDate(py.payment_date)}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{formatCurrency(py.amount)}</td>
                      <td style={{ padding: '8px', textTransform: 'capitalize' }}>{py.payment_method}</td>
                      <td style={{ padding: '8px' }}>{py.transaction_ref || 'N/A'}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`badge ${py.status === 'completed' ? 'badge-verified' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
                          {py.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </motion.div>
    </WorkerLayout>
  )
}

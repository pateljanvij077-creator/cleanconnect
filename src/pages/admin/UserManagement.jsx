import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { formatDate } from '../../utils/helpers'
import { Shield, Ban, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('*, roles(*)')
        setUsers(usersData || [])

        const { data: rolesData } = await supabase
          .from('roles')
          .select('*')
        setRoles(rolesData || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleStatusUpdate = async (userId, updateFields) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', userId)

      if (error) throw error
      
      setUsers(users.map(u => u.id === userId ? { ...u, ...updateFields } : u))
      toast.success('User privileges updated successfully!')
    } catch (err) {
      toast.error('Failed to modify user status')
    }
  }

  const handleRoleUpdate = async (userId, roleId) => {
    const targetUser = users.find(u => u.id === userId)
    if (!targetUser) return

    const targetRole = roles.find(r => r.id === roleId)
    if (!targetRole) return

    const reason = window.prompt(`Enter reason for updating role of "${targetUser.full_name}" (Security Audit Confirmation):`)
    if (reason === null) return // Admin cancelled prompt
    
    if (!reason.trim()) {
      toast.error('A security confirmation reason is required to modify user roles.')
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ role_id: roleId })
        .eq('id', userId)

      if (error) throw error

      // Log activity
      const { data: { user: adminUser } } = await supabase.auth.getUser()
      if (adminUser) {
        await supabase
          .from('activity_logs')
          .insert([{
            user_id: adminUser.id,
            action: 'UPDATE_ROLE',
            entity_type: 'user',
            entity_id: userId,
            metadata: {
              reason: reason.trim(),
              old_role: targetUser.roles?.name || 'none',
              new_role: targetRole?.name || 'none',
              user_name: targetUser.full_name
            }
          }])
      }

      setUsers(users.map(u => u.id === userId ? { ...u, role_id: roleId, roles: targetRole } : u))
      toast.success('User role updated successfully!')
    } catch (err) {
      toast.error('Failed to update user role')
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>User Directory Control</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Suspend, ban or delete homeowners and cleaners globally
            </p>
          </div>
          
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
        </div>

        {/* Users list table */}
        <div className="card glass" style={{ padding: '0.75rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No matches found</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px' }}>User Details</th>
                    <th style={{ padding: '10px' }}>Contact</th>
                    <th style={{ padding: '10px' }}>Role</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Created At</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '10px', fontWeight: 700 }}>{u.full_name}</td>
                      <td style={{ padding: '10px' }}>
                        <div>{u.phone}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email || 'No email'}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <select 
                          value={u.role_id || ''} 
                          onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                          className="form-input"
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            textTransform: 'uppercase', 
                            padding: '4px 8px', 
                            height: 'auto', 
                            width: 'auto',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-glass)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {u.is_banned ? (
                          <span className="badge badge-danger">Banned</span>
                        ) : u.is_suspended ? (
                          <span className="badge badge-pending">Suspended</span>
                        ) : (
                          <span className="badge badge-verified">Active</span>
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>{formatDate(u.created_at)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          {u.is_suspended || u.is_banned ? (
                            <button 
                              onClick={() => handleStatusUpdate(u.id, { is_suspended: false, is_banned: false })}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--success)' }}
                              title="Restore User"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleStatusUpdate(u.id, { is_suspended: true })}
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--warning)' }}
                                title="Suspend User"
                              >
                                <Shield size={14} />
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(u.id, { is_banned: true })}
                                className="btn btn-secondary btn-sm"
                                style={{ color: 'var(--danger)' }}
                                title="Ban User"
                              >
                                <Ban size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}

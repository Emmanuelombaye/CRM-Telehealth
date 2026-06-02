// src/pages/LeadDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { leadsApi } from '../services/api'
import { formatDistanceToNow, format } from 'date-fns'

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'closed', 'dead']

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    leadsApi.getById(id)
      .then(res => setLead(res.data))
      .catch(() => navigate('/leads'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const updateStatus = async (newStatus) => {
    setSaving(true)
    try {
      const res = await leadsApi.update(id, { status: newStatus })
      setLead(prev => ({ ...prev, status: newStatus, activities: res.data.lead?.activities || prev.activities }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[200, 300, 150].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />
      ))}
    </div>
  )

  if (!lead) return null

  const initials = lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Back */}
      <Link to="/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, marginBottom: 20 }}>
        ← Back to Leads
      </Link>

      {/* Hero Card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white', boxShadow: 'var(--shadow-purple)', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{lead.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className={`source-badge ${lead.source}`}>{lead.source}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          {/* Status Selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                disabled={saving}
                onClick={() => updateStatus(s)}
                className={`status-badge ${s}`}
                style={{ cursor: 'pointer', border: lead.status === s ? '1px solid currentColor' : '1px solid transparent', opacity: saving ? 0.5 : 1 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: '📱 Phone', value: lead.phone || '—' },
            { label: '📧 Email', value: lead.email || '—' },
            { label: '📋 Status', value: lead.status },
            { label: '🎯 Source', value: lead.source },
            lead.formName && { label: '📝 Form', value: lead.formName },
            lead.adId && { label: '📣 Ad ID', value: lead.adId },
          ].filter(Boolean).map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Messages */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div className="section-header">
            <span className="section-title">💬 Messages <span className="section-badge">{lead.messages?.length || 0}</span></span>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 300, overflowY: 'auto' }}>
            {(!lead.messages || lead.messages.length === 0) ? (
              <div className="empty-state"><div className="empty-icon">📨</div><p>No messages yet</p></div>
            ) : lead.messages.map(msg => (
              <div key={msg.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>{msg.type === 'sms' ? '📱' : '📧'}</span>
                    <span className={`status-badge ${msg.status === 'sent' ? 'qualified' : msg.status === 'failed' ? 'dead' : 'new'}`}>{msg.status}</span>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{msg.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div className="section-header">
            <span className="section-title">📋 Activity <span className="section-badge">{lead.activities?.length || 0}</span></span>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 300, overflowY: 'auto' }}>
            {(!lead.activities || lead.activities.length === 0) ? (
              <div className="empty-state"><div className="empty-icon">📝</div><p>No activity yet</p></div>
            ) : lead.activities.map(act => (
              <div key={act.id} style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                  {act.action.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

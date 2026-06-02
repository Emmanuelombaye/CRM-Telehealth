// src/pages/NewLead.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { leadsApi } from '../services/api'

const SOURCES = ['manual', 'website', 'meta', 'import']

export default function NewLead() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', email: '', source: 'manual' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await leadsApi.create(form)
      navigate(`/leads/${res.data.lead.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create lead. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const field = (id, label, type = 'text', placeholder = '', required = false) => (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} {required && <span style={{ color: 'var(--brand-red)' }}>*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={form[id]}
        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'var(--transition)',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--brand-purple)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )

  return (
    <div className="animate-fade-in" style={{ maxWidth: 520, margin: '0 auto' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', background: 'var(--gradient-surface)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>➕ Add New Lead</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manually add a lead — SMS + email automation will fire instantly.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {field('name', 'Full Name', 'text', 'e.g. Maria Gonzalez', true)}
          {field('phone', 'Phone Number', 'tel', 'e.g. 4155551234', true)}
          {field('email', 'Email Address', 'email', 'e.g. maria@example.com')}

          {/* Source */}
          <div style={{ marginBottom: 28 }}>
            <label htmlFor="source" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Source
            </label>
            <select
              id="source"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            >
              {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#fca5a5' }}>
              ❌ {error}
            </div>
          )}

          <button
            id="submit-lead-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? 'var(--bg-card-hover)' : 'var(--gradient-brand)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition)', fontFamily: 'inherit',
              boxShadow: loading ? 'none' : 'var(--shadow-purple)',
            }}
          >
            {loading ? '⏳ Creating...' : '🚀 Create Lead & Send Automation'}
          </button>
        </form>
      </div>
    </div>
  )
}

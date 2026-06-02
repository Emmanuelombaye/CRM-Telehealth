// src/pages/Campaigns.jsx
import { useState, useEffect } from 'react'
import { campaignsApi } from '../services/api'
import { getSocket } from '../services/socket'
import { formatDistanceToNow, format } from 'date-fns'
import './Campaigns.css'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Composer modal state
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('sms')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('Hi [Lead Name]! This is an outreach message from PEAKHEALTH.')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchCampaigns = async () => {
    try {
      const res = await campaignsApi.getAll()
      setCampaigns(res.data.campaigns || [])
    } catch (e) {
      console.error('Failed to fetch campaigns', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()

    // Listen for campaign complete events via socket to update metrics dynamically
    const socket = getSocket()
    socket.on('campaign:complete', ({ campaign }) => {
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c))
    })

    return () => {
      socket.off('campaign:complete')
    }
  }, [])

  const handleCreateCampaign = async (e) => {
    e.preventDefault()
    if (!name.trim() || !content.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await campaignsApi.create({
        name: name.trim(),
        type,
        content: content.trim(),
        ...(type === 'email' && { subject: subject.trim() })
      })
      setCampaigns(prev => [res.data.campaign, ...prev])
      setShowModal(false)
      setName('')
      setSubject('')
      setContent('Hi [Lead Name]!')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to create campaign.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendCampaign = async (id) => {
    // Optimistic status update
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'running' } : c))

    try {
      await campaignsApi.send(id)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.error || 'Failed to execute campaign.')
      fetchCampaigns() // restore lists
    }
  }

  return (
    <div className="campaigns-container animate-fade-in">
      <header className="page-header">
        <div className="header-text">
          <h2>Bulk Outreach Campaigns 📢</h2>
          <p>Launch high-volume automated SMS and Email broadcasts directly to your lead contacts database.</p>
        </div>
        <button className="create-campaign-btn" onClick={() => setShowModal(true)}>
          ➕ Create Bulk Campaign
        </button>
      </header>

      {/* Campaigns Listing */}
      <div className="campaigns-section-card">
        <h3>Campaign History</h3>

        {loading ? (
          <div className="shimmer-container">
            <div className="shimmer-row" />
            <div className="shimmer-row" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="empty-campaigns">
            <span className="empty-emoji">📢</span>
            <p>No bulk outreach campaigns deployed yet. Click "Create Bulk Campaign" above to draft your first dispatch!</p>
          </div>
        ) : (
          <div className="campaigns-grid-list">
            {campaigns.map(c => (
              <div key={c.id} className="campaign-card animate-slide-in">
                <div className="campaign-card-header">
                  <div className="campaign-badge-title">
                    <span className={`channel-badge ${c.type}`}>
                      {c.type === 'sms' ? '💬 SMS' : '📨 Email'}
                    </span>
                    <h4>{c.name}</h4>
                  </div>
                  <span className={`campaign-status-badge ${c.status}`}>
                    {c.status}
                  </span>
                </div>

                <div className="campaign-card-content">
                  <p className="campaign-body-snippet">"{c.content}"</p>
                </div>

                <div className="campaign-stats-row">
                  <div className="stat-unit">
                    <strong>{c.sentCount}</strong>
                    <span>Delivered</span>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat-unit">
                    <strong>{c.failCount}</strong>
                    <span>Failed</span>
                  </div>
                  <div className="stat-divider" />
                  <div className="stat-unit">
                    <strong>{c.createdAt ? format(new Date(c.createdAt), 'MMM d, yyyy') : '—'}</strong>
                    <span>Created At</span>
                  </div>
                </div>

                {c.status === 'draft' && (
                  <button className="execute-campaign-btn" onClick={() => handleSendCampaign(c.id)}>
                    🚀 Dispatch Bulk Campaign Now
                  </button>
                )}

                {c.status === 'running' && (
                  <div className="sending-status-spinner">
                    <span className="spinner-icon">🔄</span> Sending Outreach...
                  </div>
                )}

                {c.status === 'complete' && (
                  <div className="campaign-completed-indicator">
                    ✔️ Deployed successfully
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer Modal Dialog */}
      {showModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-card animate-zoom-in">
            <div className="modal-header">
              <h3>Create Bulk Campaign</h3>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            {error && <div className="form-error">⚠️ {error}</div>}

            <form onSubmit={handleCreateCampaign} className="modal-form">
              <div className="modal-form-group">
                <label htmlFor="campName">Campaign Name</label>
                <input
                  id="campName"
                  type="text"
                  placeholder="e.g. Memorial Day Sale Blast"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="off"
                />
              </div>

              <div className="modal-form-group">
                <label>Dispatch Outreach Channel</label>
                <div className="channel-select-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${type === 'sms' ? 'selected' : ''}`}
                    onClick={() => setType('sms')}
                    disabled={submitting}
                  >
                    💬 SMS Broadcast
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${type === 'email' ? 'selected' : ''}`}
                    onClick={() => setType('email')}
                    disabled={submitting}
                  >
                    📨 Email Broadcast
                  </button>
                </div>
              </div>

              {type === 'email' && (
                <div className="modal-form-group">
                  <label htmlFor="campSubject">Email Subject Line</label>
                  <input
                    id="campSubject"
                    type="text"
                    placeholder="e.g. Exclusive offers inside!"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    disabled={submitting}
                    autoComplete="off"
                  />
                </div>
              )}

              <div className="modal-form-group">
                <label htmlFor="campContent">Template Content Copy</label>
                <textarea
                  id="campContent"
                  rows="5"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  disabled={submitting}
                />
                <span className="copy-tip">Use <strong>[Lead Name]</strong> placeholder to auto-personalize name tags for each lead contact.</span>
              </div>

              <div className="modal-controls">
                <button type="button" className="modal-btn secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary" disabled={submitting}>
                  {submitting ? 'Creating Draft...' : 'Create Campaign Draft 📝'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

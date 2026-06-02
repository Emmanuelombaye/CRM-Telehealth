// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { settingsApi } from '../services/api'
import './Settings.css'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  
  // Org details state
  const [settings, setSettings] = useState(null)
  
  // Form input state
  const [orgName, setOrgName] = useState('')
  
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.get()
      const s = res.data.settings
      setSettings(s)
      
      // Populate form
      setOrgName(s.name || '')
    } catch (e) {
      console.error('Failed to fetch settings', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const payload = {
        name: orgName.trim(),
      }

      await settingsApi.update(payload)
      setSuccessMsg('SaaS profile settings updated successfully!')
      fetchSettings() // Reload safe configurations
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.error || 'Failed to save settings.')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate dynamic credit metrics
  const smsMax = 20000
  const emailMax = 100000
  const smsVal = settings?.smsCredits || 0
  const emailVal = settings?.emailCredits || 0
  const smsPercent = Math.max(0, Math.min(100, (smsVal / smsMax) * 100))
  const emailPercent = Math.max(0, Math.min(100, (emailVal / emailMax) * 100))

  return (
    <div className="settings-container animate-fade-in">
      <header className="page-header">
        <div className="header-text">
          <h2>Tenant Command Center ⚙️</h2>
          <p>Configure your organization profile, track omnichannel credit usage, and manage your billing profiles.</p>
        </div>
      </header>

      {loading ? (
        <div className="shimmer-container">
          <div className="shimmer-row" style={{ height: 40, width: 250, marginBottom: 20 }} />
          <div className="shimmer-row" style={{ height: 300 }} />
        </div>
      ) : (
        <div className="settings-tabs-wrapper">
          {/* Tabs header selector */}
          <div className="settings-tabs-header">
            <button className={`tab-selector-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              🏢 Organization Profile
            </button>
            <button className={`tab-selector-btn ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
              💳 Billing & Credits Usage
            </button>
            <button className={`tab-selector-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
              👥 Team Directory
            </button>
          </div>

          <div className="settings-tab-content">
            {/* ── Tab 1: Organization Profile ── */}
            {activeTab === 'profile' && (
              <div className="tab-pane animate-fade-in">
                <form onSubmit={handleSaveSettings} className="settings-form">
                  <div className="settings-card">
                    <h3>🏢 Organization Details</h3>
                    <p className="card-sub-desc">Update your company profile information. This will be reflected in outbound outreach headers and user tenant labels.</p>
                    
                    <div className="form-group">
                      <label htmlFor="companyName">Company / Organization Name</label>
                      <input
                        id="companyName"
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {successMsg && <div className="settings-success-alert">✔️ {successMsg}</div>}
                  {errorMsg && <div className="settings-error-alert">⚠️ {errorMsg}</div>}

                  <button className="settings-save-btn" type="submit" disabled={submitting}>
                    {submitting ? 'Saving Profile...' : 'Save Profile Settings 🚀'}
                  </button>
                </form>
              </div>
            )}

            {/* ── Tab 2: Billing & Credits ── */}
            {activeTab === 'billing' && (
              <div className="tab-pane animate-fade-in">
                <div className="billing-meters-grid">
                  <div className="settings-card billing-meter-card">
                    <div className="meter-header">
                      <h3>💬 Outbound SMS Meter</h3>
                      <span className="meter-tier-badge">Standard tier</span>
                    </div>
                    <p className="card-sub-desc">Monthly limits reset on the 1st of every month.</p>
                    
                    <div className="meter-numeric">
                      <strong>{smsVal.toLocaleString()}</strong> / {smsMax.toLocaleString()} credits remaining
                    </div>

                    <div className="meter-progress-container">
                      <div className="meter-progress-bar sms" style={{ width: `${smsPercent}%` }} />
                    </div>

                    <button className="topup-credits-btn" onClick={() => alert('Billing portal is simulation-ready: Stripe integration successful.')}>
                      💳 Purchase SMS Credit Bundle
                    </button>
                  </div>

                  <div className="settings-card billing-meter-card">
                    <div className="meter-header">
                      <h3>📨 Outbound Email Meter</h3>
                      <span className="meter-tier-badge">Standard tier</span>
                    </div>
                    <p className="card-sub-desc">Monthly limits reset on the 1st of every month.</p>
                    
                    <div className="meter-numeric">
                      <strong>{emailVal.toLocaleString()}</strong> / {emailMax.toLocaleString()} credits remaining
                    </div>

                    <div className="meter-progress-container">
                      <div className="meter-progress-bar email" style={{ width: `${emailPercent}%` }} />
                    </div>

                    <button className="topup-credits-btn" onClick={() => alert('Billing portal is simulation-ready: Stripe integration successful.')}>
                      💳 Purchase Email Credit Bundle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab 3: Team Directory ── */}
            {activeTab === 'team' && (
              <div className="tab-pane animate-fade-in">
                <div className="settings-card">
                  <div className="team-header">
                    <h3>👥 Workspace Team Directory</h3>
                    <button className="invite-member-btn" onClick={() => alert('Invite member flow ready to deploy.')}>
                      ➕ Invite Agent
                    </button>
                  </div>
                  <p className="card-sub-desc">Manage employees, sales representatives, and roles inside your organization workspace.</p>

                  <div className="team-members-list">
                    <div className="team-member-row">
                      <div className="member-info-col">
                        <span className="member-avatar-emoji">👤</span>
                        <div className="member-text">
                          <strong>Active Organization Admin</strong>
                          <span>Your active session credentials</span>
                        </div>
                      </div>
                      <span className="member-role-badge admin">Administrator</span>
                    </div>

                    <div className="team-member-row">
                      <div className="member-info-col">
                        <span className="member-avatar-emoji">👤</span>
                        <div className="member-text">
                          <strong>Demo Workspace Representative</strong>
                          <span>demo@telelaunch.com</span>
                        </div>
                      </div>
                      <span className="member-role-badge agent">Sales Representative</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

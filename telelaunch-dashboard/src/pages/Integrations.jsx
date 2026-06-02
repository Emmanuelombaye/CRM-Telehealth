// src/pages/Integrations.jsx
import { useState, useEffect } from 'react'
import { settingsApi } from '../services/api'
import './Integrations.css'

export default function Integrations() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  
  // Custom API Credential input overrides
  const [twilioSid, setTwilioSid] = useState('')
  const [twilioToken, setTwilioToken] = useState('')
  const [twilioPhone, setTwilioPhone] = useState('')
  const [sendgridApiKey, setSendgridApiKey] = useState('')
  const [sendgridFrom, setSendgridFrom] = useState('')
  
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.get()
      const s = res.data.settings
      setSettings(s)
      
      setTwilioPhone(s.twilioPhone || '')
      setSendgridFrom(s.sendgridFrom || '')
      setTwilioSid(s.twilioSid || '')
      setSendgridApiKey(s.hasCustomSendGrid ? '••••••••••••••••••••' : '')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSaveIntegrations = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const payload = {
        twilioSid: twilioSid && !twilioSid.includes('...') ? twilioSid.trim() : undefined,
        twilioToken: twilioToken ? twilioToken.trim() : undefined,
        twilioPhone: twilioPhone.trim() || undefined,
        sendgridApiKey: sendgridApiKey && !sendgridApiKey.includes('••') ? sendgridApiKey.trim() : undefined,
        sendgridFrom: sendgridFrom.trim() || undefined,
      }

      await settingsApi.update(payload)
      setSuccessMsg('SaaS integration credentials saved successfully!')
      fetchSettings()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.error || 'Failed to save credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  const getWebhookUrl = () => {
    const port = 5000
    const orgId = settings?.id || 'org_cuid_placeholder'
    return `${window.location.protocol}//${window.location.hostname}:${port}/webhook/meta?org=${orgId}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getWebhookUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="integrations-container animate-fade-in">
      <header className="page-header">
        <div className="header-text">
          <h2>Integrations Hub 🧩</h2>
          <p>Link your Twilio, SendGrid, Zapier, and Meta Developer accounts to run automated omnichannel outreach campaigns.</p>
        </div>
      </header>

      {loading ? (
        <div className="shimmer-container">
          <div className="shimmer-row" style={{ height: 300 }} />
        </div>
      ) : (
        <div className="integrations-layout-grid">
          {/* Left Side: Live Integrations Configurations */}
          <div className="integrations-form-panel">
            <form onSubmit={handleSaveIntegrations} className="integrations-form">
              
              {/* Twilio Card */}
              <div className="settings-card integration-config-card">
                <div className="integration-card-title-row">
                  <span className="integration-logo-emoji">📱</span>
                  <div className="integration-card-header-info">
                    <h3>Twilio Outbound SMS Integration</h3>
                    <span className={`status-badge-inline ${settings?.hasCustomTwilio ? 'connected' : 'disconnected'}`}>
                      {settings?.hasCustomTwilio ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <p className="card-sub-desc">Sync your active Twilio credentials. High-volume SMS dispatches will override the global default gateway.</p>

                <div className="form-group">
                  <label htmlFor="twSid">Twilio Account SID</label>
                  <input
                    id="twSid"
                    type="text"
                    placeholder="e.g. ACxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="twToken">Twilio Auth Token</label>
                  <input
                    id="twToken"
                    type="password"
                    placeholder={settings?.hasCustomTwilio ? '••••••••••••••••••••' : 'Input twilio token'}
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="twPhone">Twilio Outbound Phone Number</label>
                  <input
                    id="twPhone"
                    type="text"
                    placeholder="e.g. +15550001234"
                    value={twilioPhone}
                    onChange={(e) => setTwilioPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* SendGrid Card */}
              <div className="settings-card integration-config-card">
                <div className="integration-card-title-row">
                  <span className="integration-logo-emoji">📨</span>
                  <div className="integration-card-header-info">
                    <h3>SendGrid Outbound Email Integration</h3>
                    <span className={`status-badge-inline ${settings?.hasCustomSendGrid ? 'connected' : 'disconnected'}`}>
                      {settings?.hasCustomSendGrid ? 'Connected' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <p className="card-sub-desc">Sync your active SendGrid credentials. Automated email dispatches will override the global default gateway.</p>

                <div className="form-group">
                  <label htmlFor="sgKey">SendGrid API Key</label>
                  <input
                    id="sgKey"
                    type="password"
                    placeholder={settings?.hasCustomSendGrid ? '••••••••••••••••••••' : 'Input sendgrid key'}
                    value={sendgridApiKey}
                    onChange={(e) => setSendgridApiKey(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sgFrom">Verified Sender Email</label>
                  <input
                    id="sgFrom"
                    type="email"
                    placeholder="e.g. hello@mycompany.com"
                    value={sendgridFrom}
                    onChange={(e) => setSendgridFrom(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              {successMsg && <div className="settings-success-alert">✔️ {successMsg}</div>}
              {errorMsg && <div className="settings-error-alert">⚠️ {errorMsg}</div>}

              <button className="settings-save-btn" type="submit" disabled={submitting}>
                {submitting ? 'Saving Integration APIs...' : 'Save Omnichannel Integrations 🚀'}
              </button>
            </form>
          </div>

          {/* Right Side: Webhooks and marketplaces */}
          <div className="integrations-details-panel">
            {/* Meta Webhook Card */}
            <div className="settings-card">
              <div className="integration-card-title-row">
                <span className="integration-logo-emoji">🔌</span>
                <div>
                  <h3>Live Meta/Zapier Ingestion Webhook</h3>
                  <span className="status-badge-inline connected">Active</span>
                </div>
              </div>
              <p className="card-sub-desc">Push leads directly from external marketing channels (Zapier, Typeform, Webflow, Meta Lead Ads) into your isolated CRM dashboard.</p>
              
              <div className="settings-webhook-box" style={{ marginTop: 10 }}>
                <div className="webhook-box-header">
                  <span>Inbound Webhook URI</span>
                  <span className="webhook-method">POST</span>
                </div>
                <div className="webhook-url-display">
                  <code>{getWebhookUrl()}</code>
                  <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyToClipboard}>
                    {copied ? 'Copied! ✔️' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Coming Soon Marketplace */}
            <div className="settings-card coming-soon-marketplace-card">
              <h3>Marketplace (Coming Soon)</h3>
              <div className="marketplace-grid">
                <div className="marketplace-item disabled">
                  <span className="item-logo">📊</span>
                  <div className="item-txt">
                    <strong>HubSpot Sync</strong>
                    <span>Coming soon</span>
                  </div>
                </div>
                <div className="marketplace-item disabled">
                  <span className="item-logo">💼</span>
                  <div className="item-txt">
                    <strong>Salesforce Pipeline</strong>
                    <span>Coming soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

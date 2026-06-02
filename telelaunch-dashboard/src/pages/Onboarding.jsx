// src/pages/Onboarding.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Onboarding.css'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [user, setUser] = useState(null)
  const [copied, setCopied] = useState(false)
  
  // Onboarding form state
  const [industry, setIndustry] = useState('realestate')
  const [outreachType, setOutreachType] = useState('both')
  const [twilioNumber, setTwilioNumber] = useState('')
  const [welcomeText, setWelcomeText] = useState('Hi [Lead Name], thanks for reaching out! A representative from our team will contact you shortly.')
  
  const navigate = useNavigate()

  useEffect(() => {
    const rawUser = localStorage.getItem('telelaunch_user')
    if (rawUser) {
      setUser(JSON.parse(rawUser))
    } else {
      // If no session, fallback or redirect to register
      navigate('/register')
    }
  }, [navigate])

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  const handleComplete = () => {
    // Save onboarding settings mock, then redirect to Dashboard
    localStorage.setItem('telelaunch_onboarded', 'true')
    navigate('/dashboard')
  }

  const getWebhookUrl = () => {
    const port = 5000
    const orgId = user?.organizationId || 'org_cuid_placeholder'
    return `${window.location.protocol}//${window.location.hostname}:${port}/webhook/meta?org=${orgId}`
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getWebhookUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card animate-fade-in">
        {/* Progress bar */}
        <div className="onboarding-progress">
          <div className="progress-fill" style={{ width: `${(step / 4) * 100}%` }} />
          <div className="progress-steps-labels">
            <span className={step >= 1 ? 'active' : ''}>1. Context</span>
            <span className={step >= 2 ? 'active' : ''}>2. Automated Channels</span>
            <span className={step >= 3 ? 'active' : ''}>3. Integration</span>
            <span className={step >= 4 ? 'active' : ''}>4. Launch</span>
          </div>
        </div>

        {/* ── Step 1: Context ── */}
        {step === 1 && (
          <div className="onboarding-step-view animate-fade-in">
            <h2>Welcome to PEAKHEALTH, {user?.organization?.name || 'Partner'}! 👋</h2>
            <p className="step-subtitle">Let's tailor your SaaS workspace to fit your outreach volume and business context.</p>

            <div className="onboarding-form-group">
              <label>What is your business industry?</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="realestate">🏠 Real Estate & Development</option>
                <option value="solar">☀️ Renewable Energy & Solar</option>
                <option value="finance">💵 Lending & Financial Services</option>
                <option value="marketing">🚀 Digital Marketing Agency</option>
                <option value="ecom">🛒 E-Commerce & Retail</option>
                <option value="other">💼 Other B2B / Consulting Services</option>
              </select>
            </div>

            <div className="onboarding-form-group">
              <label>Expected lead volume per month</label>
              <select defaultValue="medium">
                <option value="low">1 - 500 leads / mo</option>
                <option value="medium">500 - 5,000 leads / mo</option>
                <option value="high">5,000+ leads / mo (Enterprise Scale)</option>
              </select>
            </div>

            <div className="step-controls">
              <button className="onboard-btn primary-btn" onClick={nextStep}>Continue to Channels →</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Outreach Channels ── */}
        {step === 2 && (
          <div className="onboarding-step-view animate-fade-in">
            <h2>Outreach Channels Configuration 📢</h2>
            <p className="step-subtitle">Set up your automated outreach templates. Leads entering through webhooks will receive these instantly.</p>

            <div className="onboarding-form-group">
              <label>Preferred dispatch channel</label>
              <div className="radio-cards-grid">
                <div className={`radio-card ${outreachType === 'both' ? 'selected' : ''}`} onClick={() => setOutreachType('both')}>
                  <span className="card-emoji">💬</span>
                  <div className="card-info">
                    <strong>SMS + Email (Omnichannel)</strong>
                    <span>Best results. Fires both outreach channels simultaneously.</span>
                  </div>
                </div>

                <div className={`radio-card ${outreachType === 'sms' ? 'selected' : ''}`} onClick={() => setOutreachType('sms')}>
                  <span className="card-emoji">📱</span>
                  <div className="card-info">
                    <strong>SMS Only</strong>
                    <span>Text outreach only (via Twilio API).</span>
                  </div>
                </div>

                <div className={`radio-card ${outreachType === 'email' ? 'selected' : ''}`} onClick={() => setOutreachType('email')}>
                  <span className="card-emoji">✉️</span>
                  <div className="card-info">
                    <strong>Email Only</strong>
                    <span>Email outreach only (via SendGrid API).</span>
                  </div>
                </div>
              </div>
            </div>

            {(outreachType === 'both' || outreachType === 'sms') && (
              <div className="onboarding-form-group">
                <label htmlFor="twilioNumber">Twilio Outbound Phone Number (Optional)</label>
                <input 
                  id="twilioNumber" 
                  type="text" 
                  placeholder="e.g. +15551234567" 
                  value={twilioNumber}
                  onChange={(e) => setTwilioNumber(e.target.value)}
                />
              </div>
            )}

            <div className="onboarding-form-group">
              <label htmlFor="welcomeText">Instant Welcome outreach copy</label>
              <textarea 
                id="welcomeText"
                rows="3"
                value={welcomeText}
                onChange={(e) => setWelcomeText(e.target.value)}
              />
              <span className="copy-tip">Use [Lead Name] placeholder to automatically insert lead full names.</span>
            </div>

            <div className="step-controls">
              <button className="onboard-btn secondary-btn" onClick={prevStep}>← Back</button>
              <button className="onboard-btn primary-btn" onClick={nextStep}>Save & Setup Webhook →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Webhook Integration ── */}
        {step === 3 && (
          <div className="onboarding-step-view animate-fade-in">
            <h2>Your Live Ingestion Webhook 🔌</h2>
            <p className="step-subtitle">Deploy your leads directly into PEAKHEALTH CRM. Link this endpoint to Meta Lead Ads, Zapier, Webflow, or custom forms.</p>

            <div className="webhook-box">
              <div className="webhook-box-header">
                <span>Webhook Ingestion URL (Tenant Isolated)</span>
                <span className="webhook-method">POST</span>
              </div>
              <div className="webhook-url-display">
                <code>{getWebhookUrl()}</code>
                <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copyToClipboard}>
                  {copied ? 'Copied! ✔️' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="webhook-instructions">
              <h3>How to connect:</h3>
              <ol>
                <li>Copy the endpoint URL above (bound to your organization ID).</li>
                <li>Paste it in your Meta Developer portal webhook integration or Zapier Webhook module.</li>
                <li>Send a test payload to trigger immediate lead ingestion, websocket dashboard updates, and automated outbound text triggers.</li>
              </ol>
            </div>

            <div className="step-controls">
              <button className="onboard-btn secondary-btn" onClick={prevStep}>← Back</button>
              <button className="onboard-btn primary-btn" onClick={nextStep}>All Verified, Let's Launch! →</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Complete Onboarding ── */}
        {step === 4 && (
          <div className="onboarding-step-view complete-step animate-fade-in">
            <span className="complete-rocket">🚀</span>
            <h2>PEAKHEALTH Workspace Activated!</h2>
            <p>Your SaaS tenant organization has been fully initialized. You are now running a secure, single-tenant isolated database instance.</p>

            <div className="summary-card">
              <div className="summary-row">
                <span>Organization Name</span>
                <strong>{user?.organization?.name}</strong>
              </div>
              <div className="summary-row">
                <span>Administrator Profile</span>
                <strong>{user?.email}</strong>
              </div>
              <div className="summary-row">
                <span>SMS Outreach Limits</span>
                <strong>20,000 / month (Standard Tier)</strong>
              </div>
              <div className="summary-row">
                <span>Webhook API Status</span>
                <strong className="status-green">ONLINE (Ready)</strong>
              </div>
            </div>

            <div className="step-controls">
              <button className="onboard-btn primary-btn launch-btn" onClick={handleComplete}>
                Launch CRM Dashboard ⚡
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

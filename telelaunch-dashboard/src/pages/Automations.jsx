// src/pages/Automations.jsx
import { useState } from 'react'
import './Automations.css'

export default function Automations() {
  const [rules, setRules] = useState([
    { id: '1', trigger: 'Lead Created', action: 'Send SMS Welcome outreach', delay: 'Instant', channel: 'sms', active: true },
    { id: '2', trigger: 'Lead Created', action: 'Send Email Welcome outreach', delay: '5 minutes', channel: 'email', active: true },
    { id: '3', trigger: 'Status Changed to Qualified', action: 'Create follow-up task', delay: 'Instant', channel: 'task', active: false },
    { id: '4', trigger: 'Lead Created', action: 'Add to Summer Campaign', delay: '1 hour', channel: 'campaign', active: false },
  ])

  const [newTrigger, setNewTrigger] = useState('lead_created')
  const [newAction, setNewAction] = useState('send_sms')
  const [newDelay, setNewDelay] = useState('instant')

  const handleToggleRule = (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  const handleCreateRule = (e) => {
    e.preventDefault()
    const triggerLabel = newTrigger === 'lead_created' ? 'Lead Created' : 'Status Changed to Qualified'
    const actionLabel = newAction === 'send_sms' ? 'Send SMS Welcome outreach' : newAction === 'send_email' ? 'Send Email Welcome outreach' : 'Create follow-up task'
    const delayLabel = newDelay === 'instant' ? 'Instant' : newDelay === '5m' ? '5 minutes' : '1 hour'
    const channelType = newAction === 'send_sms' ? 'sms' : newAction === 'send_email' ? 'email' : 'task'

    const newRule = {
      id: Date.now().toString(),
      trigger: triggerLabel,
      action: actionLabel,
      delay: delayLabel,
      channel: channelType,
      active: true
    }

    setRules(prev => [...prev, newRule])
  }

  return (
    <div className="automations-container animate-fade-in">
      <header className="page-header">
        <div className="header-text">
          <h2>Omnichannel Automations ⚙️</h2>
          <p>Design instant outbound responses and task sequences triggered automatically by Meta Webhooks or form leads.</p>
        </div>
      </header>

      <div className="automations-grid">
        {/* Rules Roster */}
        <div className="rules-panel">
          <div className="automations-card">
            <h3>Active Automation Rules</h3>
            <div className="rules-list">
              {rules.map(r => (
                <div key={r.id} className={`rule-item ${r.active ? 'active' : ''} animate-slide-in`}>
                  <div className="rule-info">
                    <span className={`channel-indicator ${r.channel}`}>
                      {r.channel === 'sms' ? '📱' : r.channel === 'email' ? '✉️' : r.channel === 'task' ? '✔️' : '📢'}
                    </span>
                    <div className="rule-details">
                      <strong>{r.action}</strong>
                      <span>Trigger: {r.trigger} • Delay: {r.delay}</span>
                    </div>
                  </div>
                  <div className="toggle-switch-wrapper">
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={r.active} 
                        onChange={() => handleToggleRule(r.id)}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creator panel */}
        <div className="creator-panel">
          <div className="automations-card">
            <h3>➕ Add Automation Rule</h3>
            <form onSubmit={handleCreateRule} className="automation-form">
              <div className="form-group">
                <label>Define Trigger</label>
                <select value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)}>
                  <option value="lead_created">📥 When new lead is created (Webhook/Form)</option>
                  <option value="status_qualified">⭐ When lead stage becomes Qualified</option>
                </select>
              </div>

              <div className="form-group">
                <label>Define Action</label>
                <select value={newAction} onChange={(e) => setNewAction(e.target.value)}>
                  <option value="send_sms">📱 Send Instant SMS welcome message</option>
                  <option value="send_email">✉️ Send Instant Email welcome message</option>
                  <option value="create_task">✔️ Create follow-up task checklist</option>
                </select>
              </div>

              <div className="form-group">
                <label>Configure Delay</label>
                <select value={newDelay} onChange={(e) => setNewDelay(e.target.value)}>
                  <option value="instant">Instant (Immediate execution)</option>
                  <option value="5m">5 Minutes delay</option>
                  <option value="1h">1 Hour delay</option>
                </select>
              </div>

              <button className="create-rule-btn" type="submit">
                Deploy Automation Rule ⚡
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

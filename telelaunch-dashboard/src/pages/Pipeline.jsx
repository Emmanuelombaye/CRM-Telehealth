// src/pages/Pipeline.jsx
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { leadsApi } from '../services/api'
import { getSocket } from '../services/socket'
import './Pipeline.css'

const STAGES = ['new', 'contacted', 'qualified', 'closed', 'dead']
const STAGE_LABELS = {
  new: '🔥 New Leads',
  contacted: '📱 Contacted',
  qualified: '⭐ Qualified',
  closed: '🤝 Closed Won',
  dead: '📭 Archived/Dead'
}

export default function Pipeline() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLeads = useCallback(async () => {
    try {
      const res = await leadsApi.getAll({ limit: 100 })
      setLeads(res.data.leads || [])
    } catch (e) {
      console.error('Failed to fetch leads for pipeline', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()

    const socket = getSocket()
    socket.on('lead:new', fetchLeads)
    socket.on('lead:updated', fetchLeads)

    return () => {
      socket.off('lead:new')
      socket.off('lead:updated')
    }
  }, [fetchLeads])

  const moveLead = async (leadId, currentStatus, direction) => {
    const currentIndex = STAGES.indexOf(currentStatus)
    const nextIndex = currentIndex + direction
    
    if (nextIndex < 0 || nextIndex >= STAGES.length) return

    const nextStatus = STAGES[nextIndex]
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: nextStatus } : l))

    try {
      await leadsApi.update(leadId, { status: nextStatus })
    } catch (err) {
      console.error('Failed to move lead stage', err)
      fetchLeads() // Rollback on failure
    }
  }

  // Group leads by stage
  const groupedLeads = STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.status === stage)
    return acc
  }, {})

  return (
    <div className="pipeline-wrapper animate-fade-in">
      <header className="pipeline-header">
        <div>
          <h2>Pipeline Board</h2>
          <p>Visually shift and manage your active leads through lifecycle stages.</p>
        </div>
        <Link to="/leads/new" className="add-lead-btn">+ Add Lead</Link>
      </header>

      {loading ? (
        <div className="pipeline-loading-grid">
          {STAGES.map(s => (
            <div key={s} className="skeleton" style={{ height: 400, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <div className="pipeline-board">
          {STAGES.map(stage => {
            const stageLeads = groupedLeads[stage] || []
            return (
              <div key={stage} className={`pipeline-column ${stage}`}>
                <div className="column-header">
                  <span className="column-title">{STAGE_LABELS[stage]}</span>
                  <span className="column-count">{stageLeads.length}</span>
                </div>
                
                <div className="column-cards-list">
                  {stageLeads.length === 0 ? (
                    <div className="column-empty-state">
                      <span>📭</span>
                      <p>No leads in this stage</p>
                    </div>
                  ) : (
                    stageLeads.map(l => {
                      const initials = l.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      return (
                        <div key={l.id} className="pipeline-lead-card">
                          <div className="card-lead-header">
                            <div className="lead-avatar-mini">{initials}</div>
                            <div className="lead-meta-details">
                              <Link to={`/leads/${l.id}`} className="lead-name-link">{l.name}</Link>
                              <span className={`card-source-badge ${l.source}`}>{l.source}</span>
                            </div>
                          </div>

                          <div className="card-contact-info">
                            {l.phone && <div>📱 {l.phone}</div>}
                            {l.email && <div className="truncate-text">📧 {l.email}</div>}
                          </div>

                          <div className="card-actions">
                            <button 
                              className="card-shift-btn" 
                              disabled={stage === 'new'} 
                              onClick={() => moveLead(l.id, l.status, -1)}
                              title="Move back"
                            >
                              ◀
                            </button>
                            <span className="card-status-label">{l.status}</span>
                            <button 
                              className="card-shift-btn" 
                              disabled={stage === 'dead'} 
                              onClick={() => moveLead(l.id, l.status, 1)}
                              title="Move forward"
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

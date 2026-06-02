// src/pages/Conversations.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { leadsApi } from '../services/api'
import { getSocket } from '../services/socket'
import { format } from 'date-fns'
import './Conversations.css'

export default function Conversations() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeLeadId, setActiveLeadId] = useState(null)
  const [leadDetail, setLeadDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  
  // Composer state
  const [type, setType] = useState('sms') // 'sms' | 'email'
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const chatEndRef = useRef(null)

  const fetchLeads = async () => {
    try {
      const res = await leadsApi.getAll({ limit: 100 })
      setLeads(res.data.leads || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchLeadDetail = useCallback(async (id) => {
    setDetailLoading(true)
    try {
      const res = await leadsApi.getById(id)
      setLeadDetail(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [])

  useEffect(() => {
    if (activeLeadId) {
      fetchLeadDetail(activeLeadId)
    }
  }, [activeLeadId, fetchLeadDetail])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [leadDetail])

  // Live WebSocket listener
  useEffect(() => {
    const socket = getSocket()
    
    const handleUpdate = (updatedLead) => {
      // Update leads list in place
      setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l))
      
      // If active lead, reload details
      if (activeLeadId && updatedLead.id === activeLeadId) {
        setLeadDetail(prev => ({
          ...prev,
          ...updatedLead,
          messages: updatedLead.messages || prev?.messages || [],
          activities: updatedLead.activities || prev?.activities || []
        }))
      }
    }

    socket.on('lead:new', fetchLeads)
    socket.on('lead:updated', handleUpdate)

    return () => {
      socket.off('lead:new')
      socket.off('lead:updated')
    }
  }, [activeLeadId])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!content.trim() || !activeLeadId) return

    setSending(true)
    try {
      const data = { type, content }
      if (type === 'email') {
        data.subject = subject.trim() || 'Update from PEAKHEALTH CRM'
      }

      await leadsApi.sendMessage(activeLeadId, data)
      setContent('')
      setSubject('')
      
      // Instantly refresh active lead to show outbound message
      fetchLeadDetail(activeLeadId)
    } catch (err) {
      console.error('Failed to send message', err)
    } finally {
      setSending(false)
    }
  }

  // Filter leads by search query
  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.email && l.email.toLowerCase().includes(search.toLowerCase())) ||
    l.phone.includes(search)
  )

  return (
    <div className="conversations-wrapper animate-fade-in">
      <div className="conversations-container">
        
        {/* ── Left Sidebar: Leads List ── */}
        <div className="convo-sidebar">
          <div className="sidebar-search">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="sidebar-leads-list">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton convo-skeleton-item" style={{ height: 60, borderRadius: 12, margin: '8px 12px' }} />
              ))
            ) : filteredLeads.length === 0 ? (
              <div className="no-convos-label">No active conversations found</div>
            ) : filteredLeads.map(l => {
              const initials = l.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              const isActive = l.id === activeLeadId
              
              return (
                <div 
                  key={l.id} 
                  className={`convo-lead-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveLeadId(l.id)}
                >
                  <div className="convo-lead-avatar">{initials}</div>
                  <div className="convo-lead-info">
                    <span className="convo-lead-name">{l.name}</span>
                    <span className="convo-lead-source">{l.source} · {l.phone}</span>
                  </div>
                  <div className={`status-dot-mini ${l.status}`} />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right Panel: Chat Stream ── */}
        <div className="convo-chat-panel">
          {!activeLeadId ? (
            <div className="chat-empty-state">
              <span className="empty-chat-icon">💬</span>
              <h3>Select a Conversation</h3>
              <p>Choose a lead from the left menu to view, audit, and send SMS/email automations.</p>
            </div>
          ) : (
            <>
              {/* Top Bar Header */}
              <div className="chat-header">
                <div className="header-lead-avatar">
                  {leadDetail ? leadDetail.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '—'}
                </div>
                <div className="header-lead-info">
                  <h4>{leadDetail?.name}</h4>
                  <p>{leadDetail?.phone} {leadDetail?.email && `· ${leadDetail.email}`}</p>
                </div>
                {leadDetail && (
                  <span className={`brand-source-badge ${leadDetail.source}`}>
                    {leadDetail.source === 'meta' ? '👤 Meta Ads' : leadDetail.source === 'website' ? '🌐 Website' : '👥 Referral'}
                  </span>
                )}
              </div>

              {/* Messages Stream Area */}
              <div className="chat-body-scroll">
                {detailLoading && !leadDetail ? (
                  <div className="chat-loading-spinner">Loading messages...</div>
                ) : !leadDetail?.messages || leadDetail.messages.length === 0 ? (
                  <div className="chat-empty-stream">
                    <span>📨</span>
                    <p>No messages exchanged yet. Send the first SMS or email below!</p>
                  </div>
                ) : (
                  <div className="chat-messages-stream">
                    {/* Reverse order to display oldest at top, newest at bottom */}
                    {[...leadDetail.messages].reverse().map(msg => (
                      <div key={msg.id} className="message-row outbound">
                        <div className={`message-bubble ${msg.type} ${msg.status}`}>
                          <div className="message-bubble-header">
                            <span className="bubble-type-tag">{msg.type === 'sms' ? '📱 SMS' : '📧 Email'}</span>
                            <span className={`bubble-status-tag ${msg.status}`}>{msg.status}</span>
                          </div>
                          
                          {msg.type === 'email' && msg.subject && (
                            <div className="message-email-subject">Subject: {msg.subject}</div>
                          )}
                          
                          <p className="message-bubble-text">{msg.content}</p>
                          
                          <span className="message-bubble-time">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Message Composer Footer */}
              <div className="chat-composer-footer">
                <form onSubmit={handleSendMessage} className="composer-form">
                  <div className="composer-toolbar">
                    <button 
                      type="button" 
                      className={`type-toggle-btn ${type === 'sms' ? 'active' : ''}`}
                      onClick={() => setType('sms')}
                    >
                      📱 Send SMS
                    </button>
                    <button 
                      type="button" 
                      className={`type-toggle-btn ${type === 'email' ? 'active' : ''}`}
                      onClick={() => setType('email')}
                    >
                      📧 Send Email
                    </button>
                  </div>

                  {type === 'email' && (
                    <input 
                      type="text" 
                      className="composer-subject-input" 
                      placeholder="Email Subject Line..." 
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                    />
                  )}

                  <div className="composer-input-row">
                    <textarea 
                      className="composer-textarea"
                      placeholder={type === 'sms' ? "Type SMS message here..." : "Type email body here..."}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={2}
                      required
                    />
                    <button 
                      type="submit" 
                      className="composer-send-btn" 
                      disabled={sending || !content.trim()}
                    >
                      {sending ? 'Sending...' : 'Send ➔'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

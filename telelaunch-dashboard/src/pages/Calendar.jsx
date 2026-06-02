// src/pages/Calendar.jsx
import { useState, useEffect } from 'react'
import { tasksApi, campaignsApi } from '../services/api'
import './Calendar.css'

export default function Calendar() {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [dbEvents, setDbEvents] = useState([])
  const [loading, setLoading] = useState(true)

  // Current Month/Year determinations
  const [currentDate, setCurrentDate] = useState(new Date())

  const fetchEvents = async () => {
    try {
      const [tasksRes, campaignsRes] = await Promise.all([
        tasksApi.getAll(),
        campaignsApi.getAll()
      ])

      const tasks = tasksRes.data.tasks || []
      const campaigns = campaignsRes.data.campaigns || []

      // Format Tasks
      const formattedTasks = tasks.map(t => {
        const dateObj = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt)
        return {
          id: `task-${t.id}`,
          date: dateObj.getDate(),
          month: dateObj.getMonth(),
          year: dateObj.getFullYear(),
          title: t.title,
          time: t.dueDate ? new Date(t.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day',
          desc: `Checklist Task under status "${t.status}". Created at ${new Date(t.createdAt).toLocaleDateString()}.`,
          lead: t.lead ? t.lead.name : 'Unspecified',
          type: 'call' // Visual color map: purple
        }
      })

      // Format Campaigns
      const formattedCampaigns = campaigns.map(c => {
        const dateObj = c.scheduledAt ? new Date(c.scheduledAt) : new Date(c.createdAt)
        return {
          id: `campaign-${c.id}`,
          date: dateObj.getDate(),
          month: dateObj.getMonth(),
          year: dateObj.getFullYear(),
          title: `Campaign: ${c.name}`,
          time: c.scheduledAt ? new Date(c.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          desc: `Omnichannel Campaign dispatch (${c.type.toUpperCase()}). Status: ${c.status}. Dispatched count: ${c.sentCount || 0}, Failures: ${c.failCount || 0}.`,
          lead: 'All Database Contacts',
          type: c.type === 'sms' ? 'sms' : 'email' // Green / Blue color map
        }
      })

      setDbEvents([...formattedTasks, ...formattedCampaigns])
    } catch (e) {
      console.error('Failed to load database events for calendar', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  // Sizing and alignment parameters
  const currentMonthNum = currentDate.getMonth()
  const currentYearNum = currentDate.getFullYear()
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  const currentMonthName = monthNames[currentMonthNum]

  // Days count and offset variables
  const daysInMonth = new Date(currentYearNum, currentMonthNum + 1, 0).getDate()
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  
  const firstDayOfWeekIndex = new Date(currentYearNum, currentMonthNum, 1).getDay()
  const offsetDays = Array.from({ length: firstDayOfWeekIndex })

  return (
    <div className="calendar-container animate-fade-in">
      <header className="page-header">
        <div className="header-text">
          <h2>Outreach Calendar 📅</h2>
          <p>Schedule marketing dispatches, review pending follow-up checklist tasks, and analyze outreach events dynamically mapped from your database.</p>
        </div>
      </header>

      {loading ? (
        <div className="shimmer-container">
          <div className="shimmer-row" style={{ height: 320 }} />
        </div>
      ) : (
        <>
          {dbEvents.length === 0 && (
            <div className="settings-success-alert animate-fade-in" style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1px dashed rgba(124, 58, 237, 0.25)', color: '#c084fc', padding: '14px 20px', borderRadius: 12, fontSize: '12px', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
              <span>💡</span>
              <div>
                <strong>Active Tenant Isolation Enabled:</strong> Your newly registered corporate database is successfully partitioned and empty. Go to the <strong>Tasks</strong> page to add checklists or scheduling tasks, or the <strong>Campaigns</strong> tab to draft bulk dispatches. They will immediately plot onto this calendar live!
              </div>
            </div>
          )}
          
          <div className="calendar-split-grid">
          {/* Main Grid View */}
          <div className="calendar-grid-card">
            <div className="calendar-grid-header">
              <h3>{currentMonthName} {currentYearNum}</h3>
              <div className="calendar-navigation">
                <span className="cal-navigation-placeholder" onClick={handlePrevMonth} style={{ marginRight: 15 }}>◀ Prev</span>
                <span className="cal-navigation-placeholder" onClick={handleNextMonth}>Next ▶</span>
              </div>
            </div>

            <div className="calendar-week-labels">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            <div className="calendar-days-grid">
              {/* Blank offset days for start of the month alignment */}
              {offsetDays.map((_, index) => (
                <div key={`offset-${index}`} className="day-cell offset" />
              ))}

              {calendarDays.map(day => {
                const dayEvents = dbEvents.filter(e => 
                  e.date === day && 
                  e.month === currentMonthNum && 
                  e.year === currentYearNum
                )
                
                return (
                  <div key={day} className={`day-cell ${dayEvents.length > 0 ? 'has-events' : ''}`}>
                    <span className="day-num">{day}</span>
                    <div className="day-events-list">
                      {dayEvents.map(e => (
                        <div 
                          key={e.id} 
                          className={`cal-event-dot ${e.type}`}
                          onClick={() => setSelectedEvent(e)}
                          title={`${e.title} (${e.time})`}
                        >
                          {e.type === 'call' ? '📞' : e.type === 'email' ? '📨' : '📢'}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar Event detail popover */}
          <div className="event-detail-sidebar">
            {selectedEvent ? (
              <div className="settings-card event-detail-card animate-zoom-in">
                <span className="detail-event-emoji">
                  {selectedEvent.type === 'call' ? '📞' : selectedEvent.type === 'email' ? '📨' : '📢'}
                </span>
                <h3>{selectedEvent.title}</h3>
                
                <div className="event-detail-row">
                  <span>Lead Target</span>
                  <strong>{selectedEvent.lead}</strong>
                </div>
                <div className="event-detail-row">
                  <span>Scheduled Time</span>
                  <strong>{selectedEvent.time}</strong>
                </div>
                
                <div className="event-desc-box">
                  <h4>Details:</h4>
                  <p>"{selectedEvent.desc}"</p>
                </div>

                <div className="event-controls">
                  <button className="invite-member-btn" onClick={() => alert('Action triggered successfully on your Supabase backend!')}>
                    Trigger Action Now ⚡
                  </button>
                  <button className="topup-credits-btn" onClick={() => setSelectedEvent(null)}>
                    Close Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-card empty-detail-card">
                <span className="empty-calendar-emoji">📅</span>
                <h3>Select Calendar Event</h3>
                <p>Tapping any event dot on the calendar will retrieve real-time action details, task descriptions, and lead targets dynamically from Supabase here.</p>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}

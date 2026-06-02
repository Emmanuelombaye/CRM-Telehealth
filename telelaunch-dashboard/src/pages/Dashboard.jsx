// src/pages/Dashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { leadsApi, authApi } from '../services/api'
import { getSocket } from '../services/socket'
import { formatDistanceToNow, format } from 'date-fns'
import './Dashboard.css'

const SOURCE_COLORS = {
  'Meta Lead Ads': '#7c3aed',
  'Website Forms': '#3b82f6',
  'Referrals': '#10b981',
  'Other': '#f59e0b'
}

function MetricCard({ label, value, change, isPositive, icon, color, subText }) {
  return (
    <div className={`metric-card ${color} animate-fade-in`}>
      <div className="metric-header">
        <div className="metric-text-group">
          <span className="metric-label">{label}</span>
          <h3 className="metric-value">{value}</h3>
        </div>
        <div className={`metric-icon ${color}`}>{icon}</div>
      </div>
      <div className="metric-footer">
        <span className={`metric-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '↑' : '↓'} {change}
        </span>
        <span className="metric-sub">{subText}</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [newIds, setNewIds] = useState(new Set())
  const [hasMounted, setHasMounted] = useState(false)
  const [sessionUser, setSessionUser] = useState(null)
  const feedRef = useRef(null)

  const fetchLeads = async () => {
    try {
      const res = await leadsApi.getAll({ limit: 50 })
      setLeads(res.data.leads || [])
    } catch (e) {
      console.error('Failed to fetch leads', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchSession = async () => {
    try {
      const res = await authApi.getSession()
      setSessionUser(res.data.user)
    } catch (e) {
      console.error('Failed to fetch session', e)
    }
  }

  useEffect(() => {
    fetchLeads()
    fetchSession()
    setTimeout(() => setHasMounted(true), 150)

    const socket = getSocket()
    socket.on('lead:new', (lead) => {
      setLeads(prev => [lead, ...prev])
      setNewIds(prev => new Set([...prev, lead.id]))
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(lead.id); return s }), 2000)
    })
    socket.on('lead:updated', (lead) => {
      setLeads(prev => prev.map(l => l.id === lead.id ? lead : l))
    })

    return () => {
      socket.off('lead:new')
      socket.off('lead:updated')
    }
  }, [])

  // Dynamic Metrics derived from DB
  const totalLeads = leads.length
  const newCount = leads.filter(l => l.status === 'new').length
  const contactedCount = leads.filter(l => l.status === 'contacted').length
  const qualifiedCount = leads.filter(l => l.status === 'qualified').length
  const closedCount = leads.filter(l => l.status === 'closed').length

  // Build Leads Overview Chart Data (Last 7 Days)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dayName = daysOfWeek[d.getDay()]
    const formattedDate = format(d, 'MMM d')
    
    // Scoped metrics for that day
    const dayLeads = leads.filter(l => format(new Date(l.createdAt), 'MMM d') === formattedDate)
    
    return {
      day: formattedDate,
      'Total': dayLeads.length || Math.floor(Math.random() * 200) + 200, // mock baseline + real triggers
      'New': dayLeads.filter(l => l.status === 'new').length || Math.floor(Math.random() * 80) + 80,
      'Contacted': dayLeads.filter(l => l.status === 'contacted').length || Math.floor(Math.random() * 120) + 120,
      'Qualified': dayLeads.filter(l => l.status === 'qualified').length || Math.floor(Math.random() * 70) + 70,
    }
  })

  // Leads by Source Doughnut Data
  const sourceDistribution = {
    'Meta Lead Ads': leads.filter(l => l.source === 'meta').length || 1352,
    'Website Forms': leads.filter(l => l.source === 'website').length || 642,
    'Referrals': leads.filter(l => l.source === 'referral').length || 312,
    'Other': leads.filter(l => l.source === 'manual').length || 237,
  }
  const totalSourceCount = Object.values(sourceDistribution).reduce((a, b) => a + b, 0)
  const pieData = Object.entries(sourceDistribution).map(([name, value]) => ({
    name,
    value,
    percentage: ((value / totalSourceCount) * 100).toFixed(1)
  }))

  // Recent Leads Table list
  const recentLeads = [...leads].slice(0, 5)
  // Standard mock leads if DB is completely fresh to keep mockup beautiful
  const fallbackLeads = [
    { id: '1', name: 'John Smith', source: 'meta', phone: '+1 (555) 123-4567', status: 'new', createdAt: new Date() },
    { id: '2', name: 'Sarah Johnson', source: 'website', phone: '+1 (555) 987-6543', status: 'contacted', createdAt: new Date() },
    { id: '3', name: 'Michael Brown', source: 'meta', phone: '+1 (555) 456-7890', status: 'qualified', createdAt: new Date() },
    { id: '4', name: 'Emily Davis', source: 'referral', phone: '+1 (555) 321-0987', status: 'new', createdAt: new Date() },
    { id: '5', name: 'David Wilson', source: 'website', phone: '+1 (555) 654-3210', status: 'contacted', createdAt: new Date() },
  ]
  const displayLeads = recentLeads.length > 0 ? recentLeads : fallbackLeads

  // Activity feed items
  const recentActivities = [
    { id: 'act-1', type: 'meta', title: 'New lead from Facebook Ads', sub: 'John Smith', time: '2m ago', icon: '👤' },
    { id: 'act-2', type: 'sms', title: 'SMS sent to +1 (555) 123-4567', sub: 'Delivered', time: '5m ago', icon: '💬' },
    { id: 'act-3', type: 'email', title: 'Email opened by Sarah Johnson', sub: 'Re: Your quote is ready', time: '15m ago', icon: '📨' },
    { id: 'act-4', type: 'qualified', title: 'Lead moved to Qualified', sub: 'Michael Brown', time: '22m ago', icon: '⭐' },
    { id: 'act-5', type: 'task', title: 'Task completed', sub: 'Follow up with James Wilson', time: '1h ago', icon: '✔️' }
  ]

  // Pipeline Metrics
  const pipelineStages = [
    { name: 'New Leads', count: newCount || 842, percentage: 33, color: 'purple' },
    { name: 'Contacted', count: contactedCount || 1256, percentage: 49, color: 'blue' },
    { name: 'Qualified', count: qualifiedCount || 726, percentage: 28, color: 'green' },
    { name: 'Proposal Sent', count: 312, percentage: 12, color: 'orange' },
    { name: 'Closed Won', count: closedCount || 419, percentage: 16, color: 'emerald' }
  ]

  return (
    <div className="dashboard-wrapper">
      {/* ── Top Header ── */}
      <header className="dashboard-header animate-fade-in">
        <div className="header-left">
          <h2>Welcome back, {sessionUser?.email ? sessionUser.email.split('@')[0] : 'Admin'} 👋</h2>
          <p>Here's what's happening with your leads today.</p>
        </div>
        <div className="header-right">
          <div className="header-control date-picker">
            <span>May 12 – May 18, 2025</span>
            <span className="arrow-down">▼</span>
          </div>
          <button className="header-control icon-btn" title="Filters">
            🎛️ <span>Filter</span>
          </button>
          <button className="header-control icon-btn notification" title="Notifications">
            🔔 <span className="notification-badge">5</span>
          </button>
          <Link to="/leads/new" className="add-lead-btn">
            + Add Lead
          </Link>
        </div>
      </header>

      {/* ── Metric Cards Grid ── */}
      <div className="metrics-grid">
        <MetricCard label="Total Leads" value={totalLeads || "2,543"} change="18.5%" isPositive={true} icon="👥" color="purple" subText="vs May 5 – May 11" />
        <MetricCard label="New Leads" value={newCount || "842"} change="24.3%" isPositive={true} icon="👤" color="blue" subText="vs May 5 – May 11" />
        <MetricCard label="Messages Sent" value="1,892" change="16.8%" isPositive={true} icon="💬" color="green" subText="vs May 5 – May 11" />
        <MetricCard label="Conversion Rate" value="28.6%" change="6.2%" isPositive={true} icon="📈" color="orange" subText="vs May 5 – May 11" />
        <MetricCard label="Revenue" value="$45,680" change="32.1%" isPositive={true} icon="💵" color="pink" subText="vs May 5 – May 11" />
      </div>

      {/* ── Middle Grid ── */}
      <div className="middle-dashboard-grid">
        {/* Leads Overview Area Chart */}
        <div className="dashboard-card chart-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="card-header">
            <span className="card-title">Leads Overview</span>
            <div className="card-controls">
              <div className="selector">Daily ▼</div>
            </div>
          </div>
          <div className="chart-wrapper" style={{ height: 250, minWidth: 0 }}>
            {hasMounted && (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#090916', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#f1f5f9' }}
                    cursor={{ stroke: 'rgba(124,58,237,0.2)', strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="Total" stroke="#7c3aed" strokeWidth={2} fill="url(#purpleGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Chart Legends */}
          <div className="chart-legend-grid">
            <div className="legend-item"><span className="dot total" /> Total <strong>{totalLeads || 2543}</strong></div>
            <div className="legend-item"><span className="dot new" /> New <strong>{newCount || 842}</strong></div>
            <div className="legend-item"><span className="dot contacted" /> Contacted <strong>{contactedCount || 1256}</strong></div>
            <div className="legend-item"><span className="dot qualified" /> Qualified <strong>{qualifiedCount || 726}</strong></div>
          </div>
        </div>

        {/* Leads by Source Doughnut */}
        <div className="dashboard-card pie-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <span className="card-title">Leads by Source</span>
          </div>
          <div className="pie-wrapper">
            <div className="pie-chart-container" style={{ position: 'relative', width: 140, height: 140 }}>
              <PieChart width={140} height={140}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SOURCE_COLORS[entry.name]} />
                  ))}
                </Pie>
              </PieChart>
              <div className="pie-center-label">
                <span className="num">{totalSourceCount}</span>
                <span className="txt">Total</span>
              </div>
            </div>
            {/* Pie Legends */}
            <div className="pie-legend-list">
              {pieData.map((item, index) => (
                <div key={item.name} className="pie-legend-item">
                  <span className="legend-dot" style={{ background: SOURCE_COLORS[item.name] }} />
                  <div className="legend-info">
                    <span className="legend-name">{item.name}</span>
                    <span className="legend-value">{item.value.toLocaleString()} ({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="dashboard-card activities-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="card-header">
            <span className="card-title">Recent Activities</span>
            <span className="card-link">View All</span>
          </div>
          <div className="activities-list" ref={feedRef}>
            {recentActivities.map((act) => (
              <div key={act.id} className="activity-row">
                <div className={`activity-avatar-icon ${act.type}`}>{act.icon}</div>
                <div className="activity-details">
                  <span className="activity-title-text">{act.title}</span>
                  <span className="activity-sub-text">{act.sub}</span>
                </div>
                <span className="activity-time-text">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div className="bottom-dashboard-grid">
        {/* Recent Leads Table */}
        <div className="dashboard-card recent-leads-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">
            <span className="card-title">Recent Leads</span>
            <Link to="/leads" className="view-all-leads-btn">View All Leads</Link>
          </div>
          <div className="table-wrapper">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {displayLeads.map((l, index) => {
                  const initials = l.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  const isNew = newIds.has(l.id)
                  
                  return (
                    <tr key={l.id} className={isNew ? 'new-lead-row' : ''}>
                      <td>
                        <div className="table-name-cell">
                          <div className="avatar-circle">{initials}</div>
                          <span className="table-lead-name">
                            <Link to={`/leads/${l.id}`} className="lead-link">{l.name}</Link>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`brand-source-badge ${l.source}`}>
                          {l.source === 'meta' ? '👤 Meta Ads' : l.source === 'website' ? '🌐 Website' : '👥 Referral'}
                        </span>
                      </td>
                      <td>{l.phone || '—'}</td>
                      <td>
                        <span className={`status-badge ${l.status}`}>{l.status}</span>
                      </td>
                      <td>
                        {l.createdAt instanceof Date 
                          ? 'Just now' 
                          : formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="dashboard-card pipeline-card animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="card-header">
            <span className="card-title">Pipeline Overview</span>
            <span className="card-link">View Pipeline</span>
          </div>
          <div className="pipeline-bars-list">
            {pipelineStages.map((stage) => (
              <div key={stage.name} className="pipeline-row">
                <div className="pipeline-row-header">
                  <span className="pipeline-stage-name">{stage.name}</span>
                  <span className="pipeline-stage-vals">
                    <strong>{stage.count}</strong> ({stage.percentage}%)
                  </span>
                </div>
                <div className="pipeline-progress-container">
                  <div className={`pipeline-progress-fill ${stage.color}`} style={{ width: `${stage.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="pipeline-footer">
            <span>Conversion Rate: <strong>28.6%</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}

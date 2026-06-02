// src/components/Layout.jsx
import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { connectSocket, disconnectSocket, getSocket } from '../services/socket'
import { authApi } from '../services/api'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/dashboard',     icon: '📊', label: 'Dashboard' },
  { to: '/leads',         icon: '👥', label: 'Leads' },
  { to: '/conversations', icon: '💬', label: 'Conversations', badgeCount: 12 },
  { to: '/pipeline',      icon: '🛤️', label: 'Pipeline' },
  { to: '/tasks',         icon: '✔️', label: 'Tasks', badgeCount: 8 },
  { to: '/campaigns',     icon: '📢', label: 'Campaigns' },
  { to: '/automations',   icon: '⚙️', label: 'Automations' },
  { to: '/calendar',      icon: '📅', label: 'Calendar' },
  { to: '/reports',       icon: '📈', label: 'Reports' },
  { to: '/integrations',  icon: '🧩', label: 'Integrations' },
  { to: '/settings',      icon: '⚙️', label: 'Settings' },
]

export default function Layout() {
  const [connected, setConnected] = useState(false)
  const [toasts, setToasts] = useState([])
  const [newLeadCount, setNewLeadCount] = useState(0)
  const [sessionUser, setSessionUser] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [showSwitcher, setShowSwitcher] = useState(false)
  const location = useLocation()

  const fetchSession = async () => {
    try {
      const res = await authApi.getSession()
      setSessionUser(res.data.user)
    } catch (e) {
      console.error("Failed to fetch session", e)
      setSessionUser({
        email: 'demo@telelaunch.com',
        role: 'admin',
        organization: { name: 'TeleLaunch Workspace (Demo)' }
      })
    }
  }

  const fetchOrgs = async () => {
    try {
      const res = await authApi.getOrganizations()
      setOrganizations(res.data.organizations || [])
    } catch (e) {
      console.error("Failed to fetch orgs", e)
    }
  }

  const handleSwitchTenant = (orgUser) => {
    localStorage.setItem('telelaunch_token', `mock-user-${orgUser.id}`)
    localStorage.setItem('telelaunch_user', JSON.stringify(orgUser))
    setShowSwitcher(false)
    window.location.reload()
  }

  useEffect(() => {
    fetchSession()
    fetchOrgs()
  }, [])

  const addToast = useCallback((type, title, msg) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, title, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  useEffect(() => {
    const socket = connectSocket()

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join:dashboard')
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('lead:new', (lead) => {
      setNewLeadCount(c => c + 1)
      addToast('success', '🔥 New Lead!', `${lead.name} — ${lead.source}`)
    })

    socket.on('lead:automation_complete', ({ lead }) => {
      addToast('info', '✅ Automation done', `SMS + email sent to ${lead.name}`)
    })

    socket.on('campaign:complete', ({ campaign, smsCredits, emailCredits }) => {
      addToast('success', '📢 Campaign Complete!', `Bulk campaign "${campaign.name}" finished sending!`);
      setSessionUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          organization: {
            ...prev.organization,
            smsCredits,
            emailCredits,
          }
        }
      });
    });

    return () => disconnectSocket()
  }, [addToast])

  // Reset badge when visiting leads page
  useEffect(() => {
    if (location.pathname === '/leads') setNewLeadCount(0)
  }, [location.pathname])

  const pageTitle = {
    '/dashboard': { title: 'Dashboard', sub: 'Real-time overview' },
    '/leads': { title: 'Leads', sub: 'All contacts' },
    '/leads/new': { title: 'New Lead', sub: 'Add manually' },
  }[location.pathname] || { title: 'PEAKHEALTH', sub: '' }

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #0c4f2c 0%, #1b5e20 100%)', boxShadow: '0 4px 12px rgba(12, 79, 44, 0.25)' }}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '20px', height: '20px' }}>
              {/* Left slope (Dark Forest Green) */}
              <path d="M 2 20 L 11 6 L 15 13 L 2 20 Z" fill="#ffffff" opacity="0.9" />
              {/* Right slope (Mint Green) */}
              <path d="M 11 6 L 20 20 L 15 13 L 11 6 Z" fill="#a7f3d0" />
            </svg>
          </div>
          <div className="logo-text">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '2px', letterSpacing: '0.02em', fontSize: '14px', fontWeight: '800' }}>
              PEAK<span style={{ color: '#10b981', fontWeight: '700' }}>HEALTH</span>
            </h1>
            <p style={{ color: '#10b981' }}>CRM</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon, label, badgeCount }) => {
            const isDummy = to === '#';
            const LinkComponent = isDummy ? 'div' : NavLink;
            
            return (
              <LinkComponent 
                key={label} 
                to={isDummy ? undefined : to} 
                className={isDummy ? 'nav-link dummy' : ({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{icon}</span>
                <span>{label}</span>
                
                {/* Custom Mock Badges */}
                {badgeCount && (
                  <span className="nav-badge count">{badgeCount}</span>
                )}
                
                {/* Live leads badge */}
                {label === 'Leads' && newLeadCount > 0 && (
                  <span className="nav-badge new">{newLeadCount}</span>
                )}
              </LinkComponent>
            );
          })}
        </nav>

        {/* Profile and Credits Widgets */}
        <div className="sidebar-footer">
          {/* User Profile */}
          <div className="user-profile-wrapper" style={{ position: 'relative' }}>
            <div className="user-profile" onClick={() => setShowSwitcher(!showSwitcher)}>
              <div className="profile-avatar">
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${sessionUser?.email || 'demo'}`} alt="Profile" style={{ width: '100%', height: '100%' }} />
              </div>
              <div className="profile-info">
                <span className="profile-name">{sessionUser?.email.split('@')[0] || 'Demo User'}</span>
                <span className="profile-role">{sessionUser?.organization?.name || 'SaaS Tenant'}</span>
              </div>
              <span className="profile-chevron">▾</span>
            </div>

            {showSwitcher && (
              <div className="tenant-switcher-dropdown">
                <div className="dropdown-header">Switch Organization</div>
                <div className="orgs-list">
                  {organizations.map(org => (
                    org.users.map(u => (
                      <div 
                        key={u.id} 
                        className={`org-switch-item ${sessionUser?.id === u.id ? 'active' : ''}`}
                        onClick={() => handleSwitchTenant(u)}
                      >
                        <span className="org-avatar">🏢</span>
                        <div className="org-switch-info">
                          <strong>{org.name}</strong>
                          <span>{u.email}</span>
                        </div>
                      </div>
                    ))
                  ))}
                </div>
                <div className="dropdown-divider" />
                <Link to="/register" className="add-org-item" onClick={() => setShowSwitcher(false)}>
                  ➕ Register New Company
                </Link>
              </div>
            )}
          </div>

          {/* Credits Widgets */}
          <div className="sidebar-widgets">
            <div className="widget-item">
              <div className="widget-header">
                <div className={`system-dot ${connected ? 'online' : 'offline'}`} />
                <span>System Status</span>
              </div>
              <div className="widget-desc">All Systems Operational</div>
            </div>

            <div className="widget-item">
              <div className="widget-title">SMS Credits</div>
              <div className="widget-bar-container">
                <div className="widget-bar sms" style={{ width: `${sessionUser?.organization ? Math.max(0, Math.min(100, (sessionUser.organization.smsCredits / 20000) * 100)) : 62}%` }} />
              </div>
              <div className="widget-label">{sessionUser?.organization ? sessionUser.organization.smsCredits.toLocaleString() : '12,450'} / 20,000</div>
            </div>

            <div className="widget-item">
              <div className="widget-title">Email Credits</div>
              <div className="widget-bar-container">
                <div className="widget-bar email" style={{ width: `${sessionUser?.organization ? Math.max(0, Math.min(100, (sessionUser.organization.emailCredits / 100000) * 100)) : 98}%` }} />
              </div>
              <div className="widget-label">{sessionUser?.organization ? sessionUser.organization.emailCredits.toLocaleString() : '98,500'} / 100,000</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {/* ── Toasts ── */}
      <div className="toast-container" role="alert" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{t.type === 'success' ? '🔥' : t.type === 'error' ? '❌' : '✅'}</span>
            <div className="toast-text">
              <div className="toast-title">{t.title}</div>
              <div className="toast-msg">{t.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// src/pages/Leads.jsx
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { leadsApi } from '../services/api'
import { getSocket } from '../services/socket'
import { formatDistanceToNow } from 'date-fns'
import './Leads.css'

const STATUSES = ['', 'new', 'contacted', 'qualified', 'closed', 'dead']
const SOURCES  = ['', 'meta', 'website', 'manual', 'import']

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const navigate = useNavigate()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (status) params.status = status
      if (source) params.source = source
      const res = await leadsApi.getAll(params)
      setLeads(res.data.leads || [])
      setPagination(res.data.pagination || {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, search, status, source])

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300) // debounce search
    return () => clearTimeout(t)
  }, [fetchLeads])

  // Live updates
  useEffect(() => {
    const socket = getSocket()
    socket.on('lead:new', () => fetchLeads())
    socket.on('lead:updated', () => fetchLeads())
    return () => { socket.off('lead:new'); socket.off('lead:updated') }
  }, [fetchLeads])

  const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="leads-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="leads-search"
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <select
          id="status-filter"
          className="filter-select"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <select
          id="source-filter"
          className="filter-select"
          value={source}
          onChange={e => { setSource(e.target.value); setPage(1) }}
        >
          <option value="">All Sources</option>
          {SOURCES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="leads-table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Phone</th>
              <th>Source</th>
              <th>Status</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {[80, 100, 60, 80, 70, 50].map((w, j) => (
                  <td key={j}>
                    <div className="skeleton" style={{ height: 14, width: `${w}%`, maxWidth: w * 2 }} />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  No leads found. <Link to="/leads/new" style={{ color: 'var(--brand-purple-light)' }}>Add the first one →</Link>
                </td>
              </tr>
            )}

            {!loading && leads.map(lead => (
              <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                <td>
                  <div className="lead-name-cell">
                    <div className="lead-avatar">{initials(lead.name)}</div>
                    <div>
                      <div className="lead-name">{lead.name}</div>
                      {lead.email && <div className="lead-email">{lead.email}</div>}
                    </div>
                  </div>
                </td>
                <td>{lead.phone || '—'}</td>
                <td>
                  <span className={`source-badge ${lead.source}`}>{lead.source}</span>
                </td>
                <td>
                  <span className={`status-badge ${lead.status}`}>
                    <div className={`status-dot ${lead.status}`} />
                    {lead.status}
                  </span>
                </td>
                <td>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</td>
                <td onClick={e => e.stopPropagation()}>
                  <Link className="action-btn" to={`/leads/${lead.id}`}>View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <span>{pagination.total} leads total</span>
            <div className="pagination-btns">
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

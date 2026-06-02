// src/pages/Tasks.jsx
import { useState, useEffect } from 'react'
import { tasksApi, leadsApi } from '../services/api'
import { format } from 'date-fns'
import './Tasks.css'

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Creation form state
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [leadId, setLeadId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchTasksAndLeads = async () => {
    try {
      const [tasksRes, leadsRes] = await Promise.all([
        tasksApi.getAll(),
        leadsApi.getAll({ limit: 100 })
      ])
      setTasks(tasksRes.data.tasks || [])
      setLeads(leadsRes.data.leads || [])
    } catch (e) {
      console.error('Failed to fetch tasks', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasksAndLeads()
  }, [])

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const res = await tasksApi.create({
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        leadId: leadId || undefined
      })
      setTasks(prev => [res.data.task, ...prev])
      setTitle('')
      setDueDate('')
      setLeadId('')
    } catch (err) {
      console.error(err)
      setError('Failed to create task. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t))

    try {
      await tasksApi.update(id, { status: nextStatus })
    } catch (err) {
      console.error('Failed to update task status', err)
      // Rollback
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t))
    }
  }

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return

    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== id))

    try {
      await tasksApi.delete(id)
    } catch (err) {
      console.error('Failed to delete task', err)
      // Refresh list to restore
      fetchTasksAndLeads()
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="tasks-container animate-fade-in">
      <header className="page-header">
        <div className="header-text">
          <h2>Task Manager ✔️</h2>
          <p>Organize, schedule, and check off follow-up tasks for your tenant leads.</p>
        </div>
      </header>

      <div className="tasks-grid">
        {/* Left Side: Tasks list */}
        <div className="tasks-list-panel">
          <div className="tasks-section-card">
            <h3>Active Tasks ({pendingTasks.length})</h3>
            
            {loading ? (
              <div className="shimmer-container">
                <div className="shimmer-row" />
                <div className="shimmer-row" />
              </div>
            ) : pendingTasks.length === 0 ? (
              <p className="empty-tasks-desc">🎉 All tasks checked off! Nice work.</p>
            ) : (
              <div className="tasks-list">
                {pendingTasks.map(t => (
                  <div key={t.id} className="task-item animate-slide-in">
                    <div className="task-left">
                      <button 
                        className="checkbox-btn pending" 
                        onClick={() => handleToggleStatus(t.id, t.status)}
                        title="Mark Completed"
                      />
                      <div className="task-details">
                        <strong className="task-title-text">{t.title}</strong>
                        <div className="task-tags">
                          {t.lead && (
                            <span className="task-tag lead">👤 {t.lead.name}</span>
                          )}
                          {t.dueDate && (
                            <span className={`task-tag date ${new Date(t.dueDate) < new Date() ? 'overdue' : ''}`}>
                              📅 {format(new Date(t.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button className="task-delete-btn" onClick={() => handleDeleteTask(t.id)} title="Delete Task">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tasks-section-card completed-card">
            <h3>Completed Tasks ({completedTasks.length})</h3>
            {completedTasks.length === 0 ? (
              <p className="empty-tasks-desc">Completed tasks will appear here.</p>
            ) : (
              <div className="tasks-list">
                {completedTasks.map(t => (
                  <div key={t.id} className="task-item completed animate-slide-in">
                    <div className="task-left">
                      <button 
                        className="checkbox-btn completed" 
                        onClick={() => handleToggleStatus(t.id, t.status)}
                        title="Mark Pending"
                      />
                      <div className="task-details">
                        <span className="task-title-text">{t.title}</span>
                        {t.lead && (
                          <span className="task-tag lead">👤 {t.lead.name}</span>
                        )}
                      </div>
                    </div>
                    <button className="task-delete-btn" onClick={() => handleDeleteTask(t.id)} title="Delete Task">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Create Task Card */}
        <div className="create-task-panel">
          <div className="tasks-section-card create-card">
            <h3>➕ Create New Task</h3>
            {error && <div className="form-error">⚠️ {error}</div>}

            <form onSubmit={handleCreateTask} className="task-form">
              <div className="task-form-group">
                <label htmlFor="taskTitle">Task Description</label>
                <input
                  id="taskTitle"
                  type="text"
                  placeholder="e.g. Call John Doe to review proposal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="off"
                />
              </div>

              <div className="task-form-group">
                <label htmlFor="taskLead">Link to Lead (Optional)</label>
                <select
                  id="taskLead"
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">— Select an active Lead —</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
                  ))}
                </select>
              </div>

              <div className="task-form-group">
                <label htmlFor="taskDue">Due Date (Optional)</label>
                <input
                  id="taskDue"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <button className="task-submit-btn" type="submit" disabled={submitting}>
                {submitting ? 'Creating Task...' : 'Add Task to Checklist ✔️'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

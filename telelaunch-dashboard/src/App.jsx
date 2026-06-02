// src/App.jsx — Active SaaS Routing Enabled
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import LeadDetail from './pages/LeadDetail'
import NewLead from './pages/NewLead'
import Pipeline from './pages/Pipeline'
import Conversations from './pages/Conversations'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import Tasks from './pages/Tasks'
import Campaigns from './pages/Campaigns'
import Settings from './pages/Settings'
import Automations from './pages/Automations'
import Calendar from './pages/Calendar'
import Reports from './pages/Reports'
import Integrations from './pages/Integrations'

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/new" element={<NewLead />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="automations" element={<Automations />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="reports" element={<Reports />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}


// src/pages/Register.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../services/api'
import './Register.css'

export default function Register() {
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await authApi.register({ email, orgName })
      // Save the mock bearer token to localStorage
      localStorage.setItem('telelaunch_token', res.data.token)
      // Save user details for context
      localStorage.setItem('telelaunch_user', JSON.stringify(res.data.user))
      
      // Redirect to onboarding
      navigate('/onboarding')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: 'linear-gradient(135deg, #0c4f2c 0%, #1b5e20 100%)', borderRadius: '16px', marginBottom: '14px', boxShadow: '0 8px 24px rgba(12, 79, 44, 0.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '32px', height: '32px' }}>
              {/* Left slope (Dark Forest Green) */}
              <path d="M 2 20 L 11 6 L 15 13 L 2 20 Z" fill="#ffffff" opacity="0.9" />
              {/* Right slope (Mint Green) */}
              <path d="M 11 6 L 20 20 L 15 13 L 11 6 Z" fill="#a7f3d0" />
            </svg>
          </div>
          <h2>PEAK<span>HEALTH</span></h2>
          <p>Register your organization and deploy a secure, custom-branded SaaS lead pipeline.</p>
        </div>

        {error && (
          <div className="auth-error animate-shake">
            <span>⚠️</span> {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="orgName">Organization / Company Name</label>
            <input
              id="orgName"
              type="text"
              placeholder="e.g. Acme Agency Inc"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Administrator Email</label>
            <input
              id="email"
              type="email"
              placeholder="e.g. admin@acmeagency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Deploying Tenant Infrastructure...' : 'Deploy Tenant Organization 🚀'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Want to go back to the demo workspace? <Link to="/dashboard" className="demo-link">Access Sandbox</Link></p>
        </div>
      </div>
    </div>
  )
}

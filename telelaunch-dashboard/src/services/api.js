// src/services/api.js — Axios API client
import axios from 'axios'

const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    try {
      const url = new URL(envUrl);
      if (url.hostname === 'localhost' && currentHost !== 'localhost') {
        url.hostname = currentHost;
      }
      return url.origin;
    } catch (e) {
      return `${window.location.protocol}//${currentHost}:5000`;
    }
  }
  return envUrl;
};

const API_BASE = getBackendUrl();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Automatically attach Bearer tokens in localStorage to all API calls
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('telelaunch_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ── Authentication & SaaS Onboarding ──────────────────────────
export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  getSession: () => api.get('/api/auth/session'),
  getOrganizations: () => api.get('/api/auth/organizations'),
}

// ── Tasks ─────────────────────────────────────────────────────
export const tasksApi = {
  getAll: () => api.get('/api/tasks'),
  create: (data) => api.post('/api/tasks', data),
  update: (id, data) => api.patch(`/api/tasks/${id}`, data),
  delete: (id) => api.delete(`/api/tasks/${id}`),
}

// ── Bulk Campaigns ────────────────────────────────────────────
export const campaignsApi = {
  getAll: () => api.get('/api/campaigns'),
  create: (data) => api.post('/api/campaigns', data),
  send: (id) => api.post(`/api/campaigns/${id}/send`),
}

// ── Settings & Integrations ───────────────────────────────────
export const settingsApi = {
  get: () => api.get('/api/settings'),
  update: (data) => api.patch('/api/settings', data),
}

// ── Leads ─────────────────────────────────────────────────────
export const leadsApi = {
  getAll: (params = {}) => api.get('/api/leads', { params }),
  getById: (id) => api.get(`/api/leads/${id}`),
  create: (data) => api.post('/api/leads', data),
  update: (id, data) => api.patch(`/api/leads/${id}`, data),
  delete: (id) => api.delete(`/api/leads/${id}`),
  sendMessage: (id, data) => api.post(`/api/leads/${id}/messages`, data),
}

export default api

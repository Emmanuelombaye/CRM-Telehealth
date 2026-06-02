import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Global Console Warning Filter — Silences transient Recharts sizing warnings
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('The width') &&
    args[0].includes('of chart should be greater than 0')
  ) {
    return
  }
  originalWarn(...args)
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ 
      v7_startTransition: true, 
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialRouteTransition: true,
      v7_skipActionErrorRevalidation: true
    }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

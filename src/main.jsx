import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const rootElement = document.getElementById('root')

if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    console.error('React failed to mount:', error)
    rootElement.innerHTML = `
      <div style="padding:20px;color:red;font-family:sans-serif;">
        <h2>Error Loading App</h2>
        <pre>${error.message}</pre>
        <p>Check browser console for details.</p>
      </div>
    `
  }
} else {
  console.error('Root element not found!')
}

// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initializePwaInstallPrompt } from './pwa/pwaInstall'
import { registerServiceWorker } from './pwa/registerServiceWorker'

initializePwaInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerServiceWorker()

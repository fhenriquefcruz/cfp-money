// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/mobile-phase-20-4-fixes.css'
import { initializePwaInstallPrompt } from './pwa/pwaInstall'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { initializeMobileViewportExperience } from './mobile/mobileViewport'

initializeMobileViewportExperience()
initializePwaInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerServiceWorker()

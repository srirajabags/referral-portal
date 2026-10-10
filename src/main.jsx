import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import UpdateGate from './UpdateGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Wraps every page, so a stale build is caught on the sign-in screen too. */}
    <UpdateGate>
      <App />
    </UpdateGate>
  </StrictMode>,
)

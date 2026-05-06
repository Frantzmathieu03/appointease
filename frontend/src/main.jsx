import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = 'pk_test_ZXhwZXJ0LWVzY2FyZ290LTEuY2xlcmsuYWNjb3VudHMuZGV2JA'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)

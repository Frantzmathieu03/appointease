import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClientLogin from './pages/ClientLogin'
import ClientDashboard from './pages/ClientDashboard'
import BookAppointment from './pages/BookAppointment'
import Pricing from './pages/Pricing'
import Businesses from './pages/Businesses'
import BookBusiness from './pages/BookBusiness'
import ResetPassword from './pages/ResetPassword'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'
import Contact from './pages/Contact'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/client" element={<ClientLogin />} />
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/book/search" element={<BookAppointment />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/businesses" element={<Businesses />} />
        <Route path="/book/:slug" element={<BookBusiness />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={
          token
            ? <Dashboard setToken={setToken} setShowLogin={setShowLogin} />
            : showLogin
            ? <Login setToken={setToken} setShowLogin={setShowLogin} />
            : <Landing setShowLogin={setShowLogin} />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClientLogin from './pages/ClientLogin'
import ClientDashboard from './pages/ClientDashboard'
import BookAppointment from './pages/BookAppointment'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [showLogin, setShowLogin] = useState(false)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/client" element={<ClientLogin />} />
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/book/:businessId" element={<BookAppointment />} />
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
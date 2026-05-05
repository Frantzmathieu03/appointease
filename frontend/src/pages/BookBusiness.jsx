import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function BookBusiness() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [service, setService] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [clientForm, setClientForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const categoryLabels = {
    salon: 'Hair Salon', barbershop: 'Barbershop', dental: 'Dental',
    doctor: 'Doctor', lawyer: 'Lawyer', other: 'Other'
  }

  const categoryIcons = {
    salon: '💇', barbershop: '✂️', dental: '🦷',
    doctor: '🩺', lawyer: '⚖️', other: '🏢'
  }

  useEffect(() => {
    fetchBusiness()
  }, [slug])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/businesses?search=' + slug.replace(/-/g, ' '))
      const data = await res.json()
      if (data.length > 0) {
        setBusiness(data[0])
      }
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    const url = isSignup
      ? 'https://appointease-03wm.onrender.com/api/auth/user/signup'
      : 'https://appointease-03wm.onrender.com/api/auth/user/login'
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      })
      const data = await res.json()
      if (!res.ok) { setAuthError(data.message); setAuthLoading(false); return }
      localStorage.setItem('clientToken', data.token)
      localStorage.setItem('client', JSON.stringify(data.user))
      setShowLogin(false)
      setAuthLoading(false)
    } catch (err) {
      setAuthError('Something went wrong.')
      setAuthLoading(false)
    }
  }

  const handleBook = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('clientToken')
    if (!token) { setShowLogin(true); return }
    setBooking(true)
    setError('')
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/appointments/book', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business._id, service, date: date + 'T' + time })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); setBooking(false); return }
      setSuccess(true)
      setBooking(false)
    } catch (err) {
      setError('Something went wrong.')
      setBooking(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>

  if (!business) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-800 mb-2">Business not found</p>
        <p className="text-slate-500 mb-6">This booking page doesn't exist.</p>
        <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg">Go home</button>
      </div>
    </div>
  )

  if (success) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Appointment booked!</h2>
        <p className="text-slate-500 mb-2">Your appointment at <strong>{business.name}</strong> is confirmed.</p>
        <p className="text-slate-400 text-sm mb-8">You will receive a reminder by SMS and email before your appointment.</p>
        <button onClick={() => navigate('/client/dashboard')} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl">View my appointments</button>
      </div>
    </div>
  )

  if (showLogin) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800">AppointEase</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">{isSignup ? 'Create account to book' : 'Sign in to book'}</h2>
        <p className="text-slate-500 text-sm mb-6">Booking at <strong>{business.name}</strong></p>
        {authError && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm">{authError}</div>}
        <form onSubmit={handleAuth} className="space-y-3">
          {isSignup && (
            <>
              <input type="text" placeholder="Full name" value={clientForm.name}
                onChange={e => setClientForm({...clientForm, name: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input type="tel" placeholder="Phone number" value={clientForm.phone}
                onChange={e => setClientForm({...clientForm, phone: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </>
          )}
          <input type="email" placeholder="Email address" value={clientForm.email}
            onChange={e => setClientForm({...clientForm, email: e.target.value})}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          <input type="password" placeholder="Password" value={clientForm.password}
            onChange={e => setClientForm({...clientForm, password: e.target.value})}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          <button type="submit" disabled={authLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
            {authLoading ? 'Please wait...' : isSignup ? 'Create account & book' : 'Sign in & book'}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => setIsSignup(!isSignup)} className="text-indigo-600 font-medium ml-1">
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800">AppointEase</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center text-3xl">
              {categoryIcons[business.category] || '🏢'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{business.name}</h1>
              <p className="text-slate-500">{categoryLabels[business.category] || business.category}</p>
            </div>
          </div>
          <div className="space-y-2">
            {(business.city || business.state) && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>📍</span>
                <span>{[business.address, business.city, business.state, business.zipCode].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2 text-sm">
                <span>📞</span>
                <a href={'tel:' + business.phone} className="text-indigo-600">{business.phone}</a>
              </div>
            )}
            {business.email && (
              <div className="flex items-center gap-2 text-sm">
                <span>✉️</span>
                <a href={'mailto:' + business.email} className="text-indigo-600">{business.email}</a>
              </div>
            )}
            {business.totalReviews > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-400">{'★'.repeat(Math.round(business.avgRating))}</span>
                <span className="text-slate-600">{business.avgRating} ({business.totalReviews} reviews)</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Book an appointment</h2>
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Service needed</label>
              <input type="text" value={service} onChange={e => setService(e.target.value)}
                placeholder="e.g. Haircut, Cleaning, Consultation"
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <button type="submit" disabled={booking}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
              {booking ? 'Booking...' : 'Confirm appointment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

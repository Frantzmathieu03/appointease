import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function BookBusiness() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState('auth')
  const [service, setService] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [isSignup, setIsSignup] = useState(true)
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
    const token = localStorage.getItem('clientToken')
    if (token) setStep('book')
  }, [slug])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/businesses?search=' + slug.replace(/-/g, ' '))
      const data = await res.json()
      if (data.length > 0) setBusiness(data[0])
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
      setAuthLoading(false)
      setStep('book')
    } catch (err) {
      setAuthError('Something went wrong.')
      setAuthLoading(false)
    }
  }

  const handleBook = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('clientToken')
    if (!token) { setStep('auth'); return }
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
        <p className="text-slate-500 mb-6">This booking page does not exist.</p>
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

      <div className="max-w-lg mx-auto px-6 py-10">

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl">
              {categoryIcons[business.category] || '🏢'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{business.name}</h1>
              <p className="text-slate-500 text-sm">{categoryLabels[business.category] || business.category}</p>
              {(business.city || business.state) && (
                <p className="text-slate-400 text-xs mt-1">📍 {[business.city, business.state].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className={'flex items-center gap-2 text-sm font-medium ' + (step === 'auth' ? 'text-indigo-600' : 'text-emerald-500')}>
            <div className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (step === 'auth' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white')}>
              {step === 'auth' ? '1' : '✓'}
            </div>
            Create account
          </div>
          <div className="flex-1 h-px bg-slate-200"></div>
          <div className={'flex items-center gap-2 text-sm font-medium ' + (step === 'book' ? 'text-indigo-600' : 'text-slate-400')}>
            <div className={'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (step === 'book' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>
              2
            </div>
            Book appointment
          </div>
        </div>

        {step === 'auth' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              {isSignup ? 'Create your account' : 'Sign in'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {isSignup ? "You'll receive SMS & email reminders for your appointment" : 'Welcome back!'}
            </p>
            {authError && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm">{authError}</div>}
            <form onSubmit={handleAuth} className="space-y-3">
              {isSignup && (
                <input type="text" placeholder="Full name" value={clientForm.name}
                  onChange={e => setClientForm({...clientForm, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              )}
              <input type="email" placeholder="Email address" value={clientForm.email}
                onChange={e => setClientForm({...clientForm, email: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              {isSignup && (
                <input type="tel" placeholder="Phone number (for SMS reminders)" value={clientForm.phone}
                  onChange={e => setClientForm({...clientForm, phone: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              )}
              <input type="password" placeholder="Password" value={clientForm.password}
                onChange={e => setClientForm({...clientForm, password: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              <button type="submit" disabled={authLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
                {authLoading ? 'Please wait...' : isSignup ? 'Continue →' : 'Sign in →'}
              </button>
            </form>
            <p className="text-center text-slate-500 text-sm mt-4">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button onClick={() => setIsSignup(!isSignup)} className="text-indigo-600 font-medium ml-1">
                {isSignup ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        )}

        {step === 'book' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Book your appointment</h2>
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
                {booking ? 'Booking...' : 'Confirm appointment ✓'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

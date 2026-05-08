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
  const [myAppointments, setMyAppointments] = useState([])
  const [cancelling, setCancelling] = useState(null)
  const [client, setClient] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')

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
    const savedClient = localStorage.getItem('client')
    if (token && savedClient) {
      setClient(JSON.parse(savedClient))
      setStep('dashboard')
    }
  }, [slug])

  useEffect(() => {
    if (step === 'dashboard' && business) {
      fetchMyAppointments()
    }
  }, [step, business])

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

  const fetchMyAppointments = async () => {
    try {
      const token = localStorage.getItem('clientToken')
      const res = await fetch('https://appointease-03wm.onrender.com/api/appointments/my', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await res.json()
      setMyAppointments(data)
    } catch (err) {}
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
      setClient(data.user)
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

  const handleCancel = async (appointmentId) => {
    setCancelling(appointmentId)
    try {
      const token = localStorage.getItem('clientToken')
      await fetch('https://appointease-03wm.onrender.com/api/appointments/cancel/' + appointmentId, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token }
      })
      fetchMyAppointments()
    } catch (err) {}
    setCancelling(null)
  }

  const handleReschedule = async (appointmentId) => {
    if (!rescheduleDate || !rescheduleTime) return
    try {
      const token = localStorage.getItem('clientToken')
      await fetch('https://appointease-03wm.onrender.com/api/appointments/reschedule/' + appointmentId, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rescheduleDate + 'T' + rescheduleTime })
      })
      setRescheduling(null)
      setRescheduleDate('')
      setRescheduleTime('')
      fetchMyAppointments()
    } catch (err) {}
  }

  const handleLogout = () => {
    localStorage.removeItem('clientToken')
    localStorage.removeItem('client')
    setClient(null)
    setStep('auth')
    setMyAppointments([])
  }

  const statusColors = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-rose-50 text-rose-700',
    rescheduled: 'bg-amber-50 text-amber-700',
    completed: 'bg-blue-50 text-blue-700',
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading...</div>

  if (!business) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-800 mb-2">Business not found</p>
        <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-2 rounded-lg mt-4">Go home</button>
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
        <button onClick={() => { setSuccess(false); setStep('dashboard'); fetchMyAppointments() }} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl mb-3">View my appointments</button>
        <button onClick={() => navigate('/businesses')} className="w-full border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl">Find other businesses</button>
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
        {client && (
          <div className="flex items-center gap-3">
            <span className="text-slate-600 text-sm hidden md:block">Hi, {client.name}</span>
            <button onClick={handleLogout} className="text-xs text-rose-500 hover:text-rose-600 font-medium">Logout</button>
          </div>
        )}
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
              {business.phone {business.phone && <p className="text-slate-400 text-xs mt-0.5">📞 {business.phone}</p>}{business.phone && <p className="text-slate-400 text-xs mt-0.5">📞 {business.phone}</p>} <a href={"tel:" + business.phone} className="flex items-center gap-1 text-xs mt-0.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold px-3 py-1.5 rounded-full transition w-fit">📞 Call {business.name}</a>}
            </div>
          </div>
        </div>

        {step === 'auth' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              {isSignup ? 'Create your account' : 'Welcome back!'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {isSignup ? 'One account to book at any business on AppointEase' : 'Sign in to book your appointment'}
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
                {authLoading ? 'Please wait...' : isSignup ? 'Create account and continue' : 'Sign in and continue'}
              </button>
            </form>
            <p className="text-center text-slate-500 text-sm mt-4">
              {isSignup ? 'Already have an account?' : 'No account yet?'}
              <button onClick={() => setIsSignup(s => !s)} className="text-indigo-600 font-medium ml-1">
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
                {booking ? 'Booking...' : 'Confirm appointment'}
              </button>
            </form>
            <button onClick={() => setStep('dashboard')} className="w-full text-center text-slate-500 text-sm mt-4 hover:text-indigo-600">
              Back to my appointments
            </button>
          </div>
        )}

        {step === 'dashboard' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-4">Your appointments at {business.name}</h2>
              {myAppointments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">No appointments yet at this business</p>
              ) : (
                <div className="space-y-4">
                  {myAppointments.map(a => (
                    <div key={a._id} className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-slate-800">{a.service}</p>
                          <p className="text-slate-500 text-sm">{new Date(a.date).toLocaleDateString()} at {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <span className={'text-xs font-semibold px-3 py-1 rounded-full capitalize ' + (statusColors[a.status] || 'bg-slate-100 text-slate-600')}>
                          {a.status}
                        </span>
                      </div>
                      {a.status === 'confirmed' && (
                        <>
                          {rescheduling === a._id ? (
                            <div className="space-y-2 mt-2">
                              <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              <div className="flex gap-2">
                                <button onClick={() => handleReschedule(a._id)}
                                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold py-2 rounded-lg transition">
                                  Confirm reschedule
                                </button>
                                <button onClick={() => setRescheduling(null)}
                                  className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg transition">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => setRescheduling(a._id)}
                                className="flex-1 border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-semibold py-2 rounded-lg transition">
                                Reschedule
                              </button>
                              <button onClick={() => handleCancel(a._id)} disabled={cancelling === a._id}
                                className="flex-1 border border-rose-200 text-rose-500 hover:bg-rose-50 text-xs font-semibold py-2 rounded-lg transition disabled:opacity-50">
                                {cancelling === a._id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setStep('book')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition">
              + Book another appointment
            </button>
            <button onClick={() => navigate('/businesses')}
              className="w-full border border-slate-200 text-slate-600 hover:border-indigo-300 font-semibold py-3 rounded-xl transition">
              Find other businesses
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login({ setToken, setShowLogin }) {
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', category: '',
    city: '', state: '', zipCode: '', address: ''
  })

  const categories = [
    { value: 'salon', label: '💇 Hair Salon' },
    { value: 'barbershop', label: '✂️ Barbershop' },
    { value: 'dental', label: '🦷 Dental' },
    { value: 'doctor', label: '🩺 Doctor' },
    { value: 'lawyer', label: '⚖️ Lawyer' },
    { value: 'other', label: '🏢 Other' }
  ]

  const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const url = isSignup
      ? 'https://appointease-03wm.onrender.com/api/auth/business/signup'
      : 'https://appointease-03wm.onrender.com/api/auth/business/login'
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); setLoading(false); return }
      localStorage.setItem('token', data.token)
      localStorage.setItem('business', JSON.stringify(data.business))
      setToken(data.token)
      setLoading(false)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, type: 'business' }),
        signal: controller.signal
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (!res.ok) { setError(data.message); setLoading(false); return }
      setSuccess('Reset link sent to your phone!')
      setLoading(false)
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
    }
  }

  if (isForgot) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setShowLogin(false)}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800">AppointEase</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Forgot password</h2>
        <p className="text-slate-500 text-sm mb-6">Enter your email and we will send a reset link to your phone.</p>
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 mb-4 text-sm">{success}</div>}
        <form onSubmit={handleForgot} className="space-y-4">
          <input type="email" placeholder="Email address" value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
            {loading ? 'Sending... (may take 30 seconds)' : 'Send reset link'}
          </button>
        </form>
        <button onClick={() => setIsForgot(false)} className="w-full text-center text-slate-500 text-sm mt-4 hover:text-indigo-600">
          ← Back to sign in
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setShowLogin(false)}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800">AppointEase</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {isSignup ? 'Create your account' : 'Sign in to your dashboard'}
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          {isSignup ? 'Start your 7-day free trial today' : 'Welcome back'}
        </p>

        {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <input type="text" placeholder="Business name" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          )}
          <input type="email" placeholder="Email address" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          <input type="password" placeholder="Password" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          {isSignup && (
            <>
              <input type="tel" placeholder="Phone number" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="text" placeholder="Street address" value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="City" value={form.city}
                  onChange={e => setForm({...form, city: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" placeholder="Zip code" value={form.zipCode}
                  onChange={e => setForm({...form, zipCode: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <select value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select state</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
            {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {!isSignup && (
          <button onClick={() => setIsForgot(true)} className="w-full text-center text-indigo-600 text-sm mt-3 hover:underline">
            Forgot your password?
          </button>
        )}

        <p className="text-center text-slate-500 text-sm mt-4">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => setIsSignup(!isSignup)} className="text-indigo-600 font-medium ml-1">
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

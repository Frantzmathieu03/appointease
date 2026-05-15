import Logo from '../Logo'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function ClientLogin() {
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const endpoint = isSignup ? '/api/auth/user/signup' : '/api/auth/user/login'
      const res = await fetch('https://appointease-03wm.onrender.com' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message || 'Something went wrong'); setLoading(false); return }
      localStorage.setItem('clientToken', data.token)
      localStorage.setItem('client', JSON.stringify(data.user))
      navigate('/client/dashboard')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className='min-h-screen bg-slate-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md shadow-sm'>
        <div className='cursor-pointer mb-8' onClick={() => navigate('/')}><Logo /></div>
        <h1 className='text-2xl font-bold text-slate-800 mb-1'>{isSignup ? 'Create your account' : 'Sign in'}</h1>
        <p className='text-slate-500 text-sm mb-6'>{isSignup ? 'Book appointments with local businesses' : 'Welcome back'}</p>
        {error && <div className='bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm'>{error}</div>}
        <form onSubmit={handleSubmit} className='space-y-3'>
          {isSignup && (
            <input type='text' placeholder='Full name' value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
          )}
          <input type='email' placeholder='Email address' value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
          <input type='password' placeholder='Password' value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
          {isSignup && (
            <input type='tel' placeholder='Phone number (for reminders)' value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
          )}
          <button type='submit' disabled={loading}
            className='w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50'>
            {loading ? 'Please wait...' : (isSignup ? 'Create account' : 'Sign in')}
          </button>
        </form>
        <p className='text-center text-slate-500 text-sm mt-4'>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <button onClick={() => { setIsSignup(!isSignup); setError('') }} className='text-indigo-600 font-medium ml-1'>
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
        <button onClick={() => navigate('/businesses')} className='w-full text-center text-slate-400 text-sm mt-3 hover:text-indigo-600'>
          Browse businesses →
        </button>
      </div>
    </div>
  )
}
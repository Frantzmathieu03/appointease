import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../Logo'

export default function ResetPassword() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const type = params.get('type') || 'business'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, type })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); setLoading(false); return }
      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError('Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800">AppointEase</span>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Password reset!</h2>
            <p className="text-slate-500 mb-6">Your password has been updated successfully.</p>
            <button onClick={() => navigate('/')} className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl">
              Sign in now
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Reset your password</h2>
            <p className="text-slate-500 text-sm mb-6">Enter your new password below.</p>
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
            <form onSubmit={handleReset} className="space-y-4">
              <input type="password" placeholder="New password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              <input type="password" placeholder="Confirm new password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

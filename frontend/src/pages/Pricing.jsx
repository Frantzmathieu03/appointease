import Logo from '../Logo'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Pricing() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [showSignup, setShowSignup] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', phone: '', category: '', city: '', state: '', zipCode: '' })
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState('')

  const plans = [
    { id: 'starter', name: 'Starter', price: '39', desc: 'Perfect for solo practitioners', features: ['Up to 50 appointments/mo', 'SMS + Email reminders', '1 staff member', 'Basic analytics', 'Listed in business directory'], popular: false },
    { id: 'professional', name: 'Professional', price: '49', desc: 'For growing businesses', features: ['Unlimited appointments', 'Custom reminder timing', 'Up to 5 staff members', 'Priority support', 'Featured in directory'], popular: true },
    { id: 'enterprise', name: 'Enterprise', price: '129', desc: 'For large teams', features: ['Unlimited everything', 'Unlimited staff', 'Custom branding', 'Dedicated support', 'Top directory listing'], popular: false }
  ]

  const categories = [
    { value: 'salon', label: 'Hair Salon' },
    { value: 'barbershop', label: 'Barbershop' },
    { value: 'dental', label: 'Dental' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'lawyer', label: 'Lawyer' },
    { value: 'other', label: 'Other' }
  ]

  const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

  const checkout = async (token, planId) => {
    setLoading(planId)
    setError('')
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/payments/create-checkout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      })
      const data = await res.json()
      if (res.status === 401) { localStorage.removeItem('token'); setPendingPlan(planId); setShowSignup(true); setLoading(null); return }
      if (!res.ok) { setError(data.message); setLoading(null); return }
      window.location.href = data.url
    } catch (err) {
      setError('Something went wrong.'); setLoading(null)
    }
  }

  const handleSubscribe = (planId) => {
    const token = localStorage.getItem('token')
    if (!token) { setPendingPlan(planId); setShowSignup(true); return }
    checkout(token, planId)
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setSignupLoading(true)
    setSignupError('')
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/business/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm)
      })
      const data = await res.json()
      if (!res.ok) { setSignupError(data.message); setSignupLoading(false); return }
      localStorage.setItem('token', data.token)
      localStorage.setItem('business', JSON.stringify(data.business))
      setShowSignup(false)
      setSignupLoading(false)
      if (pendingPlan) { const plan = pendingPlan; setPendingPlan(null); checkout(data.token, plan) }
    } catch (err) {
      setSignupError('Something went wrong.'); setSignupLoading(false)
    }
  }

  if (showSignup) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center p-4'>
        <div className='bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md'>
          <div className='cursor-pointer mb-6' onClick={() => navigate('/')}><Logo /></div>
          <h2 className='text-2xl font-bold text-slate-800 mb-1'>Create your account</h2>
          <p className='text-slate-500 text-sm mb-6'>Start your 7-day free trial</p>
          {signupError && <div className='bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm'>{signupError}</div>}
          <form onSubmit={handleSignup} className='space-y-3'>
            <input type='text' placeholder='Business name' value={signupForm.name} onChange={e => setSignupForm({...signupForm, name: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
            <input type='email' placeholder='Email address' value={signupForm.email} onChange={e => setSignupForm({...signupForm, email: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
            <input type='password' placeholder='Password' value={signupForm.password} onChange={e => setSignupForm({...signupForm, password: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
            <input type='tel' placeholder='Phone number' value={signupForm.phone} onChange={e => setSignupForm({...signupForm, phone: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
            <select value={signupForm.category} onChange={e => setSignupForm({...signupForm, category: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required>
              <option value=''>Select category</option>
              {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input type='text' placeholder='City' value={signupForm.city} onChange={e => setSignupForm({...signupForm, city: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
            <select value={signupForm.state} onChange={e => setSignupForm({...signupForm, state: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required>
              <option value=''>Select state</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type='text' placeholder='Zip code' value={signupForm.zipCode} onChange={e => setSignupForm({...signupForm, zipCode: e.target.value})} className='w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500' required />
            <button type='submit' disabled={signupLoading} className='w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50'>
              {signupLoading ? 'Creating account...' : 'Create account and start free trial'}
            </button>
          </form>
          <p className='text-center text-slate-400 text-xs mt-4'>Already have an account? <button onClick={() => navigate('/')} className='text-indigo-600'>Sign in here</button></p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50'>
      <nav className='bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between'>
        <div className='cursor-pointer' onClick={() => navigate('/')}><Logo /></div>
        <button onClick={() => navigate('/')} className='text-sm text-slate-500 hover:text-indigo-600 font-medium transition'>Back</button>
      </nav>
      <div className='max-w-5xl mx-auto px-6 py-16'>
        <div className='text-center mb-14'>
          <h1 className='text-4xl font-extrabold text-slate-800 mb-4'>Simple, honest pricing</h1>
          <p className='text-slate-500 text-lg'>No hidden fees. Cancel anytime. Start with a 7-day free trial.</p>
        </div>
        {error && <div className='bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-6 text-sm text-center'>{error}</div>}
        <div className='grid md:grid-cols-3 gap-8'>
          {plans.map(plan => (
            <div key={plan.id} className={'bg-white rounded-2xl border-2 p-8 relative ' + (plan.popular ? 'border-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-200')}>
              {plan.popular && <div className='absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full'>MOST POPULAR</div>}
              <h3 className='text-xl font-bold text-slate-800 mb-1'>{plan.name}</h3>
              <div className='text-4xl font-extrabold text-slate-800 mb-1'><span className='text-2xl font-normal text-slate-400'>$</span>{plan.price}<span className='text-lg font-normal text-slate-400'>/mo</span></div>
              <p className='text-emerald-600 text-sm font-semibold mb-2'>7-day free trial included</p>
              <p className='text-slate-500 text-sm mb-6'>{plan.desc}</p>
              <ul className='space-y-3 mb-8'>
                {plan.features.map((f, i) => (
                  <li key={i} className='flex items-center gap-2 text-slate-600 text-sm'>
                    <span className='text-emerald-500 font-bold'>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleSubscribe(plan.id)} disabled={loading === plan.id}
                className={'w-full font-semibold py-3 rounded-xl transition disabled:opacity-50 ' + (plan.popular ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50')}>
                {loading === plan.id ? 'Loading...' : 'Start 7-day free trial'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
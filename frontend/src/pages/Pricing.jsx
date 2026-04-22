import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Login from './Login'

export default function Pricing() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')
  const [showSignup, setShowSignup] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$39',
      desc: 'Perfect for solo practitioners',
      features: [
        'Up to 50 appointments/mo',
        'SMS + Email reminders',
        '1 staff member',
        'Basic analytics',
        'Listed in business directory'
      ],
      color: 'border-slate-200',
      btn: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$49',
      desc: 'For growing businesses',
      features: [
        'Unlimited appointments',
        'SMS + Email reminders',
        'Custom reminder timing',
        'Up to 5 staff members',
        'Priority support',
        'Featured in directory'
      ],
      color: 'border-indigo-600',
      popular: true,
      btn: 'bg-indigo-600 text-white hover:bg-indigo-700'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$129',
      desc: 'For large teams',
      features: [
        'Unlimited everything',
        'Unlimited staff',
        'Custom branding',
        'Dedicated support',
        'API access',
        'Top directory listing'
      ],
      color: 'border-slate-200',
      btn: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
    }
  ]

  const handleSubscribe = async (planId) => {
    const currentToken = localStorage.getItem('token')
    if (!currentToken) {
      setPendingPlan(planId)
      setShowSignup(true)
      return
    }
    setLoading(planId)
    setError('')
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + currentToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planId })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message)
        setLoading(null)
        return
      }
      window.location.href = data.url
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  const handleSignupComplete = (newToken) => {
    setShowSignup(false)
    if (pendingPlan) {
      handleSubscribe(pendingPlan)
      setPendingPlan(null)
    }
  }

  if (showSignup) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-md mx-auto pt-10 px-4">
          <div className="text-center mb-6">
            <p className="text-slate-500 text-sm">Create your account to start your free trial</p>
          </div>
          <Login
            setToken={handleSignupComplete}
            setShowLogin={() => setShowSignup(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800">AppointEase</span>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition">← Back</button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Simple, honest pricing</h1>
          <p className="text-slate-500 text-lg">No hidden fees. Cancel anytime. Start with a 7-day free trial.</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-8 text-sm text-center">{error}</div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map(plan => (
            <div key={plan.id} className={'bg-white rounded-2xl border-2 p-8 relative ' + plan.color}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
              )}
              <h3 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h3>
              <div className="text-4xl font-extrabold text-slate-800 my-4">
                {plan.price}<span className="text-lg text-slate-400 font-normal">/mo</span>
              </div>
              <p className="text-slate-500 text-sm mb-2">{plan.desc}</p>
              <p className="text-emerald-600 text-xs font-semibold mb-6">7-day free trial included</p>
              <ul className="space-y-3 text-sm text-slate-600 mb-8">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                className={'w-full font-semibold py-2.5 rounded-xl transition disabled:opacity-50 ' + plan.btn}
              >
                {loading === plan.id ? 'Loading...' : 'Start 7-day free trial'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          7-day free trial. Cancel anytime. No contracts.
        </p>
      </div>
    </div>
  )
}

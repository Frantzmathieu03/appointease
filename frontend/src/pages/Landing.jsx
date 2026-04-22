import { useNavigate } from 'react-router-dom'
import BusinessDirectory from './BusinessDirectory'

export default function Landing({ setShowLogin }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold text-slate-800">AppointEase</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowLogin(true)} className="hidden md:block text-slate-600 hover:text-indigo-600 font-medium text-sm transition">Business login</button>
          <button onClick={() => navigate('/client')} className="hidden md:block text-slate-600 hover:text-indigo-600 font-medium text-sm transition">Book appointment</button>
          <button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">Start free trial</button>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-block bg-indigo-50 text-indigo-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">Built for local service businesses</div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 leading-tight mb-6">
          Stop losing clients to<br />
          <span className="text-indigo-600">missed appointments</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          AppointEase automatically sends SMS and email reminders to your clients before every appointment. No more no-shows. No more manual calls. Just more revenue.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition">Start 7-day free trial</button>
          <button onClick={() => setShowLogin(true)} className="text-slate-600 hover:text-indigo-600 font-semibold px-8 py-3.5 rounded-xl text-lg border border-slate-300 hover:border-indigo-400 transition">Business login</button>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-indigo-600">98%</div>
            <div className="text-slate-500 text-sm mt-1">Show-up rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-indigo-600">2min</div>
            <div className="text-slate-500 text-sm mt-1">Setup time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-indigo-600">$0</div>
            <div className="text-slate-500 text-sm mt-1">To get started</div>
          </div>
        </div>
      </section>

      <BusinessDirectory />

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Why businesses choose AppointEase</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Everything you need to manage appointments and keep clients coming back</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: '📱', color: 'bg-emerald-50', title: 'SMS + Email reminders', desc: 'Automatic reminders sent at exactly the right time. You choose when.' },
            { icon: '📅', color: 'bg-indigo-50', title: 'Easy rescheduling', desc: 'Clients can cancel or reschedule right from their phone. No calls needed.' },
            { icon: '⚙️', color: 'bg-amber-50', title: 'Fully customizable', desc: 'Set your own reminder schedule and message for each business type.' },
            { icon: '🚫', color: 'bg-rose-50', title: 'No double booking', desc: 'Smart scheduling prevents two clients from booking the same slot.' },
            { icon: '🔔', color: 'bg-blue-50', title: 'Instant notifications', desc: 'Get notified the moment a client books, cancels, or reschedules.' },
            { icon: '💰', color: 'bg-purple-50', title: 'More revenue', desc: 'Our customers report up to 80% fewer no-shows after switching to AppointEase.' },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-8">
              <div className={'w-12 h-12 ' + f.color + ' rounded-xl flex items-center justify-center mb-5'}>
                <span className="text-2xl">{f.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition">Start 7-day free trial</button>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">How we are different</h2>
            <p className="text-slate-500">See why businesses switch from Google Calendar and Vagaro to AppointEase</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 text-slate-500 font-medium">Feature</th>
                  <th className="py-4 px-4 text-indigo-600 font-bold text-center">AppointEase</th>
                  <th className="py-4 px-4 text-slate-400 font-medium text-center">Google Calendar</th>
                  <th className="py-4 px-4 text-slate-400 font-medium text-center">Vagaro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Automatic SMS reminders', true, false, true],
                  ['Automatic email reminders', true, false, true],
                  ['Custom reminder timing', true, false, false],
                  ['Client self-rescheduling', true, false, true],
                  ['Works for any business type', true, true, false],
                  ['Simple setup in 2 minutes', true, true, false],
                  ['Affordable pricing', true, true, false],
                  ['Personal support', true, false, false],
                ].map(([feature, us, google, vagaro], i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-4 px-4 text-slate-700 font-medium">{feature}</td>
                    <td className="py-4 px-4 text-center">{us ? <span className="text-emerald-500 text-lg">✓</span> : <span className="text-slate-300 text-lg">✕</span>}</td>
                    <td className="py-4 px-4 text-center">{google ? <span className="text-emerald-500 text-lg">✓</span> : <span className="text-slate-300 text-lg">✕</span>}</td>
                    <td className="py-4 px-4 text-center">{vagaro ? <span className="text-emerald-500 text-lg">✓</span> : <span className="text-slate-300 text-lg">✕</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Simple, honest pricing</h2>
          <p className="text-slate-500">No hidden fees. Cancel anytime. 7-day free trial.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Starter</h3>
            <div className="text-4xl font-extrabold text-slate-800 my-4">$39<span className="text-lg text-slate-400 font-normal">/mo</span></div>
            <p className="text-slate-500 text-sm mb-6">Perfect for solo practitioners</p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Up to 50 appointments/mo</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> SMS + Email reminders</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> 1 staff member</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Listed in business directory</li>
            </ul>
            <button onClick={() => navigate('/pricing')} className="w-full mt-8 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-2.5 rounded-xl transition">Start free trial</button>
          </div>
          <div className="bg-indigo-600 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
            <h3 className="text-lg font-bold text-white mb-1">Professional</h3>
            <div className="text-4xl font-extrabold text-white my-4">$49<span className="text-lg text-indigo-300 font-normal">/mo</span></div>
            <p className="text-indigo-200 text-sm mb-6">For growing businesses</p>
            <ul className="space-y-3 text-sm text-indigo-100">
              <li className="flex items-center gap-2"><span className="text-emerald-300">✓</span> Unlimited appointments</li>
              <li className="flex items-center gap-2"><span className="text-emerald-300">✓</span> SMS + Email reminders</li>
              <li className="flex items-center gap-2"><span className="text-emerald-300">✓</span> Custom reminder timing</li>
              <li className="flex items-center gap-2"><span className="text-emerald-300">✓</span> Up to 5 staff members</li>
              <li className="flex items-center gap-2"><span className="text-emerald-300">✓</span> Priority support</li>
              <li className="flex items-center gap-2"><span className="text-emerald-300">✓</span> Featured in directory</li>
            </ul>
            <button onClick={() => navigate('/pricing')} className="w-full mt-8 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold py-2.5 rounded-xl transition">Start free trial</button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Enterprise</h3>
            <div className="text-4xl font-extrabold text-slate-800 my-4">$99<span className="text-lg text-slate-400 font-normal">/mo</span></div>
            <p className="text-slate-500 text-sm mb-6">For large teams</p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Unlimited everything</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Unlimited staff</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Custom branding</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Dedicated support</li>
              <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Top directory listing</li>
            </ul>
            <button onClick={() => navigate('/pricing')} className="w-full mt-8 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-2.5 rounded-xl transition">Start free trial</button>
          </div>
        </div>
      </section>

      <section className="bg-indigo-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to stop losing money to no-shows?</h2>
          <p className="text-indigo-200 mb-8 text-lg">Join hundreds of businesses already using AppointEase to fill their calendars and keep clients coming back.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button onClick={() => navigate('/pricing')} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-10 py-4 rounded-xl text-lg transition">Start your 7-day free trial</button>
            <button onClick={() => navigate('/client')} className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-10 py-4 rounded-xl text-lg transition border border-indigo-400">Book an appointment</button>
          </div>
        </div>
      </section>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-slate-700">AppointEase</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <button onClick={() => setShowLogin(true)} className="hover:text-indigo-600 transition">Business login</button>
            <button onClick={() => navigate('/client')} className="hover:text-indigo-600 transition">Book appointment</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-indigo-600 transition">Pricing</button>
          </div>
          <p className="text-slate-400 text-sm">2026 AppointEase. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

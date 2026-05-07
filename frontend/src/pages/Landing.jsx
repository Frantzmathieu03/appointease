import { useNavigate } from 'react-router-dom'

export default function Landing({ setShowLogin }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans">

      <nav className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold text-slate-900">AppointEase</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/businesses')} className="text-sm text-slate-600 font-medium hidden md:block hover:text-indigo-600 transition">Find a business</button>
          <button onClick={() => setShowLogin(true)} className="text-sm text-slate-600 font-medium hidden md:block hover:text-indigo-600 transition">Business login</button>
          <button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition">Start free trial</button>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-block bg-indigo-50 text-indigo-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">Built for local service businesses</div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-5">
          The appointment tool that <span className="text-indigo-600">eliminates no-shows</span>
        </h1>
        <p className="text-slate-500 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
          Automatically texts and emails your clients before every appointment. Set up in 2 minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <div className="bg-slate-50 rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 flex items-center gap-2"><span>📅</span> Automated reminders</div>
          <div className="bg-slate-50 rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 flex items-center gap-2"><span>📱</span> SMS + Email</div>
          <div className="bg-slate-50 rounded-full px-5 py-2.5 text-sm font-medium text-slate-600 flex items-center gap-2"><span>⚡</span> 2 min setup</div>
        </div>
        <button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-full text-lg transition mb-3 shadow-lg shadow-indigo-200">Start Your Free Trial — Free</button>
        <p className="text-slate-400 text-sm mt-3">7 days free · No credit card required</p>
      </section>

      <section className="max-w-lg mx-auto px-6 pb-10">
        <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span className="text-emerald-400 text-xs font-mono">Reminder sent successfully</span>
          </div>
          <p className="text-white text-sm mb-4 leading-relaxed">Hi <span className="text-indigo-400 font-semibold">Sarah</span> 👋 Reminder for your appointment at <span className="text-indigo-400 font-semibold">Glamour Salon</span> tomorrow at 2:00 PM. Reply CONFIRM to confirm.</p>
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div className="text-center"><p className="text-2xl font-extrabold text-white">98%</p><p className="text-slate-400 text-xs">Show-up rate</p></div>
            <div className="text-center"><p className="text-2xl font-extrabold text-indigo-400">-80%</p><p className="text-slate-400 text-xs">No-shows</p></div>
            <div className="text-center"><p className="text-2xl font-extrabold text-white">2min</p><p className="text-slate-400 text-xs">Setup time</p></div>
          </div>
        </div>
      </section>

      <section className="py-10 px-6 border-t border-slate-100">
        <p className="text-center text-slate-400 text-xs font-semibold tracking-widest uppercase mb-6">Trusted by businesses including</p>
        <div className="flex justify-center gap-10 flex-wrap text-slate-400 font-semibold text-sm">
          <span>💇 Hair Salons</span><span>✂️ Barbershops</span><span>🦷 Dental Offices</span><span>⚖️ Law Firms</span><span>🩺 Doctors</span>
        </div>
      </section>

      <section className="py-14 px-6 bg-indigo-600">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div><p className="text-4xl font-extrabold text-white">98%</p><p className="text-indigo-200 text-sm mt-1">Show-up rate</p></div>
          <div><p className="text-4xl font-extrabold text-white">2min</p><p className="text-indigo-200 text-sm mt-1">Setup time</p></div>
          <div><p className="text-4xl font-extrabold text-white">80%</p><p className="text-indigo-200 text-sm mt-1">Fewer no-shows</p></div>
          <div><p className="text-4xl font-extrabold text-white">$0</p><p className="text-indigo-200 text-sm mt-1">To get started</p></div>
        </div>
      </section>

      <section className="py-12 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Looking to book an appointment?</h2>
            <p className="text-slate-500 text-sm">Search local businesses and book instantly.</p>
          </div>
          <button onClick={() => navigate('/businesses')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full transition whitespace-nowrap">Find a business →</button>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-900">
        <div className="max-w-2xl mx-auto">
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-4">HOW IT WORKS</p>
          <h2 className="text-3xl font-extrabold text-white mb-3">From signup to first reminder in 3 steps.</h2>
          <p className="text-slate-400 mb-12">Most booking tools make you figure it out yourself. AppointEase gets you running in minutes.</p>
          <div className="space-y-10">
            {[
              { num: '1', title: 'Create your business account', desc: 'Sign up, add your business details and category. Your personal booking page is instantly created at appointease.io/book/your-name.' },
              { num: '2', title: 'Share your booking link', desc: 'Send your unique link to clients via Instagram, WhatsApp, or text. They book directly on your page.' },
              { num: '3', title: 'Reminders go out automatically', desc: 'AppointEase texts and emails your clients before every appointment. You never have to chase anyone again.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-5">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-lg">{step.num}</div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-indigo-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">FEATURES</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-10 text-center">Everything your business needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '📱', title: 'SMS reminders', desc: 'Automatic text reminders sent before every appointment.' },
              { icon: '✉️', title: 'Email reminders', desc: 'Professional emails with your business branding.' },
              { icon: '🔗', title: 'Personal booking link', desc: 'Your own page clients can book from anywhere.' },
              { icon: '⭐', title: 'Reviews system', desc: 'Collect star ratings and build your reputation.' },
              { icon: '📊', title: 'Business dashboard', desc: 'See all appointments, clients, and stats in one place.' },
              { icon: '🔔', title: 'Custom reminders', desc: 'Set your own timing and message for reminders.' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 transition">
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-slate-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <p className="text-indigo-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">COMPARISON</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-10 text-center">Why businesses switch to AppointEase</h2>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-4 px-6 text-slate-500 font-medium">Feature</th>
                  <th className="py-4 px-4 text-indigo-600 font-bold text-center">AppointEase</th>
                  <th className="py-4 px-4 text-slate-400 font-medium text-center">Google Cal</th>
                  <th className="py-4 px-4 text-slate-400 font-medium text-center">Vagaro</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Auto SMS reminders', true, false, true],
                  ['Auto email reminders', true, false, true],
                  ['Custom reminder timing', true, false, false],
                  ['Personal booking link', true, false, true],
                  ['Works for any business', true, true, false],
                  ['Setup in 2 minutes', true, true, false],
                  ['Affordable pricing', true, true, false],
                ].map(([feature, us, google, vagaro], i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-3 px-6 text-slate-700 font-medium">{feature}</td>
                    <td className="py-3 px-4 text-center">{us ? <span className="text-emerald-500 text-lg">✓</span> : <span className="text-slate-200 text-lg">✕</span>}</td>
                    <td className="py-3 px-4 text-center">{google ? <span className="text-emerald-500 text-lg">✓</span> : <span className="text-slate-200 text-lg">✕</span>}</td>
                    <td className="py-3 px-4 text-center">{vagaro ? <span className="text-emerald-500 text-lg">✓</span> : <span className="text-slate-200 text-lg">✕</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-indigo-600 text-xs font-semibold tracking-widest uppercase mb-4">PRICING</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Simple, honest pricing</h2>
          <p className="text-slate-500 mb-10">No hidden fees. Cancel anytime. 7-day free trial.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: '$39', desc: 'Solo practitioners', features: ['50 appointments/mo', 'SMS + Email reminders', '1 staff member'], popular: false },
              { name: 'Professional', price: '$49', desc: 'Growing businesses', features: ['Unlimited appointments', 'Custom reminder timing', 'Up to 5 staff'], popular: true },
              { name: 'Enterprise', price: '$129', desc: 'Large teams', features: ['Unlimited everything', 'Unlimited staff', 'Dedicated support'], popular: false },
            ].map((plan, i) => (
              <div key={i} className={'rounded-2xl p-6 text-left relative ' + (plan.popular ? 'bg-indigo-600' : 'bg-slate-50 border border-slate-100')}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>}
                <h3 className={'font-bold mb-1 ' + (plan.popular ? 'text-white' : 'text-slate-900')}>{plan.name}</h3>
                <div className={'text-3xl font-extrabold mb-1 ' + (plan.popular ? 'text-white' : 'text-slate-900')}>{plan.price}<span className="text-base font-normal opacity-50">/mo</span></div>
                <p className={'text-sm mb-4 ' + (plan.popular ? 'text-indigo-200' : 'text-slate-500')}>{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className={'text-sm flex items-center gap-2 ' + (plan.popular ? 'text-indigo-100' : 'text-slate-600')}>
                      <span className={plan.popular ? 'text-emerald-300' : 'text-emerald-500'}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/pricing')} className={'w-full font-semibold py-2.5 rounded-xl transition ' + (plan.popular ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700')}>Start free trial</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-indigo-600 py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to stop losing money to no-shows?</h2>
          <p className="text-indigo-200 mb-8 text-lg">Join businesses already using AppointEase to fill their calendars.</p>
          <button onClick={() => navigate('/pricing')} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-10 py-4 rounded-full text-lg transition">Start your 7-day free trial</button>
          <p className="text-indigo-300 text-sm mt-4">No credit card required · Cancel anytime</p>
        </div>
      </section>

      <footer className="bg-slate-900 py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-white">AppointEase</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <button onClick={() => setShowLogin(true)} className="hover:text-white transition">Business login</button>
            <button onClick={() => navigate('/businesses')} className="hover:text-white transition">Find a business</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-white transition">Pricing</button>
          </div>
          <p className="text-slate-600 text-sm">© 2026 AppointEase</p>
        </div>
      </footer>

    </div>
  )
}

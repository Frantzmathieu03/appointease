import { useNavigate } from "react-router-dom"
import Logo from "../Logo"

export default function Landing({ setShowLogin }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate('/')}><Logo /></div>
        <div className="hidden md:flex items-center gap-8">
          <button onClick={() => navigate('/businesses')} className="text-slate-600 text-sm font-medium hover:text-indigo-600 transition">Find a business</button>
          <button onClick={() => navigate('/pricing')} className="text-slate-600 text-sm font-medium hover:text-indigo-600 transition">Pricing</button>
          <button onClick={() => setShowLogin(true)} className="text-slate-600 text-sm font-medium hover:text-indigo-600 transition">Login</button>
          <button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition">Start free trial</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center text-center px-6 pt-20">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            Trusted by local businesses in Boston & beyond
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
            Stop losing money<br />to <span className="text-indigo-400">no-shows</span>
          </h1>
          <p className="text-slate-300 text-xl md:text-2xl mb-10 leading-relaxed max-w-2xl mx-auto">
            AppointEase automatically texts and emails your clients before every appointment. Reduce no-shows by 80%.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <button onClick={() => navigate('/pricing')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 py-4 rounded-full text-lg transition shadow-lg shadow-indigo-900">
              Start free — 7 days free
            </button>
            <button onClick={() => navigate('/book/frantz-business')} className="border border-slate-500 text-white hover:border-indigo-400 hover:text-indigo-300 font-bold px-8 py-4 rounded-full text-lg transition">
              See live demo →
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-slate-400 text-sm">
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> No credit card required</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Setup in 2 minutes</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-6 bg-slate-900 border-y border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 px-6">
          <span className="text-slate-500 text-xs font-semibold tracking-widest uppercase">Powered by</span>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold"><span>🔒</span> SSL Secured</div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold"><span>💳</span> Stripe Payments</div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold"><span>📱</span> Twilio SMS</div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold"><span>✉️</span> Resend Email</div>
          <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold"><span>🇺🇸</span> Made in Boston</div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center px-6">
          <div>
            <p className="text-5xl font-extrabold text-indigo-400 mb-2">98%</p>
            <p className="text-slate-400 text-sm">Show-up rate</p>
          </div>
          <div>
            <p className="text-5xl font-extrabold text-indigo-400 mb-2">2min</p>
            <p className="text-slate-400 text-sm">Setup time</p>
          </div>
          <div>
            <p className="text-5xl font-extrabold text-indigo-400 mb-2">80%</p>
            <p className="text-slate-400 text-sm">Fewer no-shows</p>
          </div>
          <div>
            <p className="text-5xl font-extrabold text-indigo-400 mb-2">$0</p>
            <p className="text-slate-400 text-sm">To get started</p>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-indigo-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">WHO IT'S FOR</p>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 text-center">Built for local service businesses</h2>
          <p className="text-slate-500 text-center mb-14 text-lg">Any business that books appointments can use AppointEase.</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { emoji: '💇', label: 'Hair Salons', img: 'photo-1560066984-138dadb4c035' },
              { emoji: '✂️', label: 'Barbershops', img: 'photo-1503951914875-452162b0f3f1' },
              { emoji: '🦷', label: 'Dental Offices', img: 'photo-1606811841689-23dfddce3e95' },
              { emoji: '⚖️', label: 'Law Firms', img: 'photo-1573496359142-b8d87734a5a2' },
              { emoji: '🩺', label: 'Doctors', img: 'photo-1559839734-2b71ea197ec2' },
            ].map((b, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden h-40 group cursor-pointer">
                <img src={`https://images.unsplash.com/${b.img}?w=400&q=80&auto=format&fit=crop`} alt={b.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-indigo-900/60 flex flex-col items-center justify-center">
                  <span className="text-3xl mb-1">{b.emoji}</span>
                  <span className="text-white text-xs font-bold">{b.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-slate-900 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-4">HOW IT WORKS</p>
            <h2 className="text-4xl font-extrabold text-white mb-4">From signup to first reminder in 3 steps</h2>
            <p className="text-slate-400 mb-12 text-lg">Most booking tools make you figure it out yourself. AppointEase gets you running in minutes.</p>
            <div className="space-y-8">
              {[
                { num: '01', title: 'Create your account', desc: 'Sign up and get your personal booking page at appointease.io/book/your-name instantly.' },
                { num: '02', title: 'Share your booking link', desc: 'Send your link via Instagram, WhatsApp, or text. Clients book directly.' },
                { num: '03', title: 'Reminders go out automatically', desc: 'SMS and email reminders sent before every appointment. Zero effort from you.' },
              ].map((s, i) => (
                <div key={i} className="flex gap-5">
                  <div className="text-indigo-400 font-extrabold text-2xl w-12 flex-shrink-0">{s.num}</div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{s.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&auto=format&fit=crop" alt="AppointEase dashboard" className="rounded-3xl w-full object-cover h-96 shadow-2xl" />
            <div className="absolute bottom-6 left-6 right-6 bg-slate-900/95 backdrop-blur rounded-2xl p-4 border border-indigo-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-xs font-mono">Reminder sent successfully</span>
              </div>
              <p className="text-white text-sm">Hi <span className="text-indigo-400 font-semibold">Aloise</span> 👋 Reminder for your appointment at <span className="text-indigo-400 font-semibold">Frantz Business</span> tomorrow at 10:00 AM.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-indigo-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">FEATURES</p>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 text-center">Everything your business needs</h2>
          <p className="text-slate-500 text-center mb-14 text-lg">One platform to manage bookings, reminders, reviews and more.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '📱', title: 'SMS Reminders', desc: 'Automatic text reminders sent before every appointment. Powered by Twilio.' },
              { icon: '✉️', title: 'Email Reminders', desc: 'Professional emails sent from your business domain automatically.' },
              { icon: '🔗', title: 'Personal Booking Link', desc: 'Your own page at appointease.io/book/your-name. Share anywhere.' },
              { icon: '⭐', title: 'Reviews System', desc: 'Collect star ratings and build your online reputation automatically.' },
              { icon: '📊', title: 'Business Dashboard', desc: 'All appointments, clients, and stats in one beautiful dashboard.' },
              { icon: '🔔', title: 'Custom Reminders', desc: 'Set your own timing — 24 hours, 2 hours, or 30 minutes before.' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition group">
                <span className="text-3xl mb-4 block">{f.icon}</span>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP SCREENSHOTS */}
      <section className="py-20 bg-slate-900 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-4 text-center">THE PRODUCT</p>
          <h2 className="text-4xl font-extrabold text-white mb-4 text-center">See it in action</h2>
          <p className="text-slate-400 text-center mb-14 text-lg">Real screenshots from AppointEase.</p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
              <img src="/image1.png" alt="AppointEase in action" className="w-full" />
            </div>
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
              <img src="/image2.png" alt="AppointEase app screens" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-indigo-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">TESTIMONIALS</p>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-14 text-center">What our clients say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-xl">★</span>)}</div>
              <p className="text-slate-700 text-lg mb-6 leading-relaxed">"AppointEase has completely changed how I manage my appointments. My clients always show up now. I booked 2 appointments in my first week!"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">A</div>
                <div>
                  <p className="font-bold text-slate-900">Aloise Cherenfant</p>
                  <p className="text-slate-500 text-sm">Client, Boston MA</p>
                </div>
              </div>
            </div>
            <div className="bg-indigo-600 rounded-2xl p-8">
              <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(i => <span key={i} className="text-amber-300 text-xl">★</span>)}</div>
              <p className="text-indigo-100 text-lg mb-6 leading-relaxed">"Setup took literally 2 minutes and my first reminder went out the same day. Worth every penny."</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">J</div>
                <div>
                  <p className="font-bold text-white">James R.</p>
                  <p className="text-indigo-200 text-sm">Barbershop Owner, Boston MA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 bg-slate-900 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-4 text-center">PRICING</p>
          <h2 className="text-4xl font-extrabold text-white mb-4 text-center">Simple, honest pricing</h2>
          <p className="text-slate-400 text-center mb-14 text-lg">No hidden fees. Cancel anytime. 7-day free trial on all plans.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Starter', price: '39', desc: 'Solo practitioners', features: ['50 appointments/mo', 'SMS + Email reminders', '1 staff member', 'Personal booking link'], popular: false },
              { name: 'Professional', price: '49', desc: 'Growing businesses', features: ['Unlimited appointments', 'Custom reminder timing', 'Up to 5 staff', 'Priority support'], popular: true },
              { name: 'Enterprise', price: '129', desc: 'Large teams', features: ['Unlimited everything', 'Unlimited staff', 'Dedicated support', 'Custom integrations'], popular: false },
            ].map((plan, i) => (
              <div key={i} className={'rounded-2xl p-8 relative border ' + (plan.popular ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700')}>
                {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full">MOST POPULAR</div>}
                <h3 className={'font-bold text-xl mb-1 ' + (plan.popular ? 'text-white' : 'text-white')}>{plan.name}</h3>
                <div className={'text-4xl font-extrabold mb-1 ' + (plan.popular ? 'text-white' : 'text-white')}>${plan.price}<span className="text-base font-normal opacity-50">/mo</span></div>
                <p className={'text-sm mb-6 ' + (plan.popular ? 'text-indigo-200' : 'text-slate-400')}>{plan.desc}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className={'text-sm flex items-center gap-2 ' + (plan.popular ? 'text-indigo-100' : 'text-slate-300')}>
                      <span className="text-emerald-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/pricing')} className={'w-full font-semibold py-3 rounded-xl transition ' + (plan.popular ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700')}>
                  Start free trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-indigo-600 text-xs font-semibold tracking-widest uppercase mb-4 text-center">ABOUT US</p>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-14 text-center">Built by a local business owner</h2>
          <div className="bg-slate-50 rounded-2xl p-10 border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
            <div className="w-24 h-24 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">F</div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">Frantz Mathieu</h3>
              <p className="text-indigo-600 font-medium mb-4">Founder & CEO — Boston, Massachusetts</p>
              <p className="text-slate-600 leading-relaxed text-lg">"I built AppointEase because I understand the pain of no-shows firsthand. Local businesses lose thousands of dollars every year to missed appointments. AppointEase fixes that with simple automated reminders that actually work."</p>
              <div className="flex gap-4 mt-4 flex-wrap">
                <a href="mailto:frantz.mathieu09@gmail.com" className="text-indigo-600 text-sm hover:underline">frantz.mathieu09@gmail.com</a>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 text-sm">Boston, MA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-5xl font-extrabold text-white mb-6">Ready to fill your calendar?</h2>
          <p className="text-indigo-200 text-xl mb-10">Join businesses already using AppointEase to eliminate no-shows and grow revenue.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => navigate('/pricing')} className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-12 py-4 rounded-full text-lg transition shadow-xl">
              Start free for 7 days
            </button>
            <button onClick={() => navigate('/book/frantz-business')} className="border-2 border-white text-white hover:bg-indigo-700 font-bold px-10 py-4 rounded-full text-lg transition">
              See live demo →
            </button>
          </div>
          <p className="text-indigo-300 text-sm mt-6">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <Logo dark={true} />
            <p className="text-slate-400 text-sm mt-4 leading-relaxed">Appointment booking with automated SMS & email reminders for local businesses.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><button onClick={() => navigate('/pricing')} className="text-slate-400 text-sm hover:text-white transition">Pricing</button></li>
              <li><button onClick={() => navigate('/businesses')} className="text-slate-400 text-sm hover:text-white transition">Find a business</button></li>
              <li><button onClick={() => navigate('/book/frantz-business')} className="text-slate-400 text-sm hover:text-white transition">Live demo</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><button onClick={() => navigate('/contact')} className="text-slate-400 text-sm hover:text-white transition">Contact</button></li>
              <li><button onClick={() => setShowLogin(true)} className="text-slate-400 text-sm hover:text-white transition">Business login</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><button onClick={() => navigate('/privacy')} className="text-slate-400 text-sm hover:text-white transition">Privacy Policy</button></li>
              <li><button onClick={() => navigate('/terms')} className="text-slate-400 text-sm hover:text-white transition">Terms of Service</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">© 2026 AppointEase · Boston, MA · All rights reserved.</p>
          <p className="text-slate-600 text-sm">Made with ❤️ in Boston, MA</p>
        </div>
      </footer>

    </div>
  )
}

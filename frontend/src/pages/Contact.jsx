import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../Logo'

export default function Contact() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  return (
    <div className="min-h-screen bg-white">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="cursor-pointer" onClick={() => navigate('/')}><Logo /></div>
        <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-indigo-600">Back to home</button>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Get in touch</h1>
            <p className="text-slate-500 mb-8">Have a question or need help? We respond within 24 hours.</p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-lg">✉️</span></div>
                <div><p className="font-semibold text-slate-900">Email</p><a href="mailto:frantz.mathieu09@gmail.com" className="text-indigo-600 text-sm hover:underline">frantz.mathieu09@gmail.com</a></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-lg">🌐</span></div>
                <div><p className="font-semibold text-slate-900">Website</p><a href="https://appointease.io" className="text-indigo-600 text-sm hover:underline">appointease.io</a></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0"><span className="text-lg">📍</span></div>
                <div><p className="font-semibold text-slate-900">Location</p><p className="text-slate-500 text-sm">Boston, Massachusetts, USA</p></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
            {sent ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Message sent!</h3>
                <p className="text-slate-500">We will get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); setSent(true) }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={5} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition">Send message</button>
              </form>
            )}
          </div>
        </div>
      </div>
      <footer className="bg-slate-900 py-8 px-6 mt-16">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Logo dark={true} />
          <div className="flex gap-6 text-sm text-slate-500">
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition">Privacy Policy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition">Terms</button>
            <button onClick={() => navigate('/contact')} className="hover:text-white transition">Contact</button>
          </div>
          <p className="text-slate-600 text-sm">2026 AppointEase</p>
        </div>
      </footer>
    </div>
  )
}

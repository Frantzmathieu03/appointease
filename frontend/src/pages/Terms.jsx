import { useNavigate } from 'react-router-dom'
import Logo from '../Logo'

export default function Terms() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-white">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="cursor-pointer" onClick={() => navigate('/')}><Logo /></div>
        <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-indigo-600">Back to home</button>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Terms and Conditions</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: May 7, 2026</p>
        <div className="space-y-8 text-slate-600 leading-relaxed">
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2><p>By accessing and using AppointEase, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our service.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2><p>AppointEase is an appointment booking and reminder platform that allows businesses to manage appointments and send automated reminders to their clients via SMS and email.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">3. Account Registration</h2><p>To use AppointEase, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">4. Payment and Billing</h2><p>AppointEase offers a 7-day free trial. After the trial period, a subscription fee is required. Payments are processed securely through Stripe. You may cancel your subscription at any time. No refunds are provided for partial months.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">5. SMS Communications</h2><p>By using AppointEase, you consent to receive SMS messages for appointment reminders. Message and data rates may apply. You can opt out at any time by replying STOP.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">6. Prohibited Uses</h2><p>You may not use AppointEase to send spam, harass users, violate any laws, or engage in any activity that disrupts our services.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">7. Limitation of Liability</h2><p>AppointEase is provided on an as-is basis. We are not liable for any damages arising from missed appointments or failed reminders.</p></section>
          <section><h2 className="text-xl font-bold text-slate-900 mb-3">8. Contact</h2><p>For questions contact us at <a href="mailto:frantz.mathieu09@gmail.com" className="text-indigo-600 hover:underline">frantz.mathieu09@gmail.com</a></p></section>
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

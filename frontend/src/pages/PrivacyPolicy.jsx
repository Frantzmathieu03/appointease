import { useNavigate } from 'react-router-dom'
import Logo from '../Logo'

export default function PrivacyPolicy() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-white">
      <nav className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
        <div className="cursor-pointer" onClick={() => navigate('/')}><Logo /></div>
        <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-indigo-600">← Back to home</button>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-10">Last updated: May 7, 2026</p>
        <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
            <p>AppointEase collects information you provide directly to us when you create an account, including your name, email address, phone number, and business information. We also collect information about appointments booked through our platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, including sending appointment reminders via SMS and email. We use your phone number and email address solely for appointment-related communications.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. SMS and Email Communications</h2>
            <p>By creating an account and booking an appointment on AppointEase, you consent to receive SMS and email reminders about your appointments. You can opt out at any time by replying STOP to any SMS message or clicking unsubscribe in any email.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Information Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with service providers who assist us in operating our platform, including Twilio for SMS delivery and Resend for email delivery.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information. Your password is encrypted and never stored in plain text. However, no method of transmission over the Internet is 100% secure.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Data Retention</h2>
            <p>We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Cookies</h2>
            <p>We use local storage to keep you logged in to your account. We do not use tracking cookies or share your browsing data with advertisers.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">8. Children's Privacy</h2>
            <p>AppointEase is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:frantz.mathieu09@gmail.com" className="text-indigo-600 hover:underline">frantz.mathieu09@gmail.com</a></p>
          </section>
        </div>
      </div>
      <footer className="bg-slate-900 py-8 px-6 mt-16">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <Logo dark={true} />
          <div className="flex gap-6 text-sm text-slate-500">
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition">Privacy Policy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition">Terms</button>
          </div>
          <p className="text-slate-600 text-sm">© 2026 AppointEase</p>
        </div>
      </footer>
    </div>
  )
}

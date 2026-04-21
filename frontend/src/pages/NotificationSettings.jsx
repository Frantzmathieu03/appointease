import { useState, useEffect } from 'react'

export default function NotificationSettings() {
  const token = localStorage.getItem('token')
  const [reminders, setReminders] = useState([{ value: 24, unit: 'hours' }])
  const [sms, setSms] = useState(true)
  const [email, setEmail] = useState(true)
  const [message, setMessage] = useState('Hi {client_name}, reminder for your appointment at {business_name} on {date} at {time}.')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('https://appointease-03wm.onrender.com/api/notifications/settings', {
      headers: { Authorization: 'Bearer ' + token }
    })
    .then(r => r.json())
    .then(data => {
      setSms(data.channels.sms)
      setEmail(data.channels.email)
      setMessage(data.customMessage)
      setReminders(data.reminders.map(r => ({ value: Number(r.value), unit: r.unit })))
      setLoading(false)
    })
    .catch(() => setLoading(false))
  }, [])

  const save = () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    fetch('https://appointease-03wm.onrender.com/api/notifications/settings', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: { sms, email }, reminders, customMessage: message })
    })
    .then(r => r.json())
    .then(data => {
      setSaving(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
    .catch(() => { setSaving(false); setError('Something went wrong') })
  }

  const addReminder = () => setReminders([...reminders, { value: 1, unit: 'hours' }])

  const removeReminder = (i) => setReminders(reminders.filter((_, idx) => idx !== i))

  const updateVal = (i, val) => setReminders(reminders.map((r, idx) => idx === i ? { ...r, value: Number(val) } : r))

  const updateUnit = (i, unit) => setReminders(reminders.map((r, idx) => idx === i ? { ...r, unit } : r))

  if (loading) return <div className="p-12 text-center text-slate-400">Loading...</div>

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="font-semibold text-slate-800 mb-6">Notification settings</h2>

      {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-4 text-sm">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 mb-4 text-sm">Settings saved!</div>}

      <div className="mb-8">
        <p className="text-sm font-medium text-slate-700 mb-3">Notification channels</p>
        <div className="flex gap-4">
          <button onClick={() => setSms(!sms)} className={'px-4 py-2.5 rounded-xl border text-sm font-medium transition ' + (sms ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-400')}>
            SMS {sms ? 'on' : 'off'}
          </button>
          <button onClick={() => setEmail(!email)} className={'px-4 py-2.5 rounded-xl border text-sm font-medium transition ' + (email ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-400')}>
            Email {email ? 'on' : 'off'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-slate-700 mb-3">Reminder schedule</p>
        <div className="space-y-3">
          {reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <span className="text-slate-500 text-sm">Send</span>
              <input
                type="number"
                min="1"
                max="999"
                value={r.value}
                onChange={e => updateVal(i, e.target.value)}
                style={{width:'80px', border:'2px solid #6366f1', borderRadius:'8px', padding:'8px', textAlign:'center', fontSize:'14px', fontWeight:'600', backgroundColor:'white', color:'#1e293b'}}
              />
              <select
                value={r.unit}
                onChange={e => updateUnit(i, e.target.value)}
                style={{border:'1px solid #cbd5e1', borderRadius:'8px', padding:'8px', fontSize:'14px', color:'#334155', backgroundColor:'white'}}
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
              <span className="text-slate-500 text-sm">before</span>
              {reminders.length > 1 && (
                <button onClick={() => removeReminder(i)} style={{marginLeft:'auto', color:'#f87171', fontSize:'20px', fontWeight:'bold', background:'none', border:'none', cursor:'pointer'}}>x</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addReminder} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          + Add another reminder
        </button>
      </div>

      <div className="mb-8">
        <p className="text-sm font-medium text-slate-700 mb-1">Custom message</p>
        <p className="text-xs text-slate-400 mb-3">Variables: client_name, business_name, date, time, service</p>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          style={{width:'100%', border:'1px solid #cbd5e1', borderRadius:'12px', padding:'12px 16px', fontSize:'14px', color:'#1e293b', backgroundColor:'white', resize:'vertical'}}
        />
      </div>

      <div className="bg-slate-50 rounded-xl p-4 mb-6">
        <p className="text-xs font-medium text-slate-500 mb-2">Preview</p>
        <p className="text-sm text-slate-700">
          {message.replace('{client_name}', 'Jordan Rivera').replace('{business_name}', 'Your Business').replace('{date}', 'Apr 25, 2026').replace('{time}', '2:00 PM').replace('{service}', 'Haircut')}
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{width:'100%', backgroundColor:'#4f46e5', color:'white', fontWeight:'600', padding:'12px', borderRadius:'12px', border:'none', cursor:'pointer', fontSize:'15px'}}
      >
        {saving ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  )
}

import { useState, useEffect } from 'react'
import ReviewsTab from './ReviewsTab'
import NotificationSettings from './NotificationSettings'

export default function Dashboard({ setToken, setShowLogin }) {
  const business = JSON.parse(localStorage.getItem('business') || '{}')
  const token = localStorage.getItem('token')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('appointments')
  const urlParams = new URLSearchParams(window.location.search)
  const paymentSuccess = urlParams.get('success')

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/appointments/business', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const data = await res.json()
      setAppointments(data)
      setLoading(false)
    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('business')
    setToken('')
  }

  const handleLogoClick = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('business')
    setToken('')
  }

  const statusColors = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-rose-50 text-rose-700',
    rescheduled: 'bg-amber-50 text-amber-700',
    completed: 'bg-blue-50 text-blue-700',
    'no-show': 'bg-slate-100 text-slate-600'
  }

  const today = new Date().toDateString()
  const todayAppts = appointments.filter(a => new Date(a.date).toDateString() === today)
  const upcomingAppts = appointments.filter(a => new Date(a.date) > new Date())
  const totalConfirmed = appointments.filter(a => a.status === 'confirmed').length
  const totalCancelled = appointments.filter(a => a.status === 'cancelled').length

  return (
    <div className="min-h-screen bg-slate-50">

      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={handleLogoClick}
        >
          <div className="w-8 h-8 bg-indigo-600 group-hover:bg-indigo-700 rounded-lg flex items-center justify-center transition">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition">AppointEase</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-600 text-sm hidden md:block">{business.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-rose-500 hover:text-rose-600 font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        <div className="mb-8">
          {paymentSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="font-semibold">Payment successful! Welcome to AppointEase Pro!</p>
                <p className="text-sm mt-1">Your subscription is now active. All features are unlocked.</p>
              </div>
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, {business.name}!</h1>
          <p className="text-slate-500 mt-1">Here is what is happening with your business today.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">Today</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{todayAppts.length}</p>
            <p className="text-slate-400 text-xs mt-1">appointments</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">Upcoming</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{upcomingAppts.length}</p>
            <p className="text-slate-400 text-xs mt-1">appointments</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">Confirmed</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{totalConfirmed}</p>
            <p className="text-slate-400 text-xs mt-1">total</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">Cancelled</p>
            <p className="text-3xl font-bold text-rose-500 mt-1">{totalCancelled}</p>
            <p className="text-slate-400 text-xs mt-1">total</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {['appointments', 'reviews', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={'px-5 py-2 rounded-lg text-sm font-medium transition capitalize ' + (
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">All appointments</h2>
            </div>
            {loading ? (
              <div className="px-6 py-12 text-center text-slate-400">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-slate-400 text-lg">No appointments yet</p>
                <p className="text-slate-300 text-sm mt-1">Appointments will appear here when clients book</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.map(a => (
                  <div key={a._id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {a.client?.name?.charAt(0) || 'C'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{a.client?.name || 'Client'}</p>
                        <p className="text-slate-500 text-sm">{a.service}</p>
                        <div className="flex gap-3 mt-1 flex-wrap">
                          {a.client?.email && (
                            <a href={'mailto:' + a.client.email} className="text-xs text-indigo-600 hover:underline">
                              {a.client.email}
                            </a>
                          )}
                          {a.client?.phone && (
                            <a href={'tel:' + a.client.phone} className="text-xs text-emerald-600 hover:underline">
                              {a.client.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-700 text-sm font-medium">
                        {new Date(a.date).toLocaleDateString()}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={'text-xs font-semibold px-3 py-1 rounded-full capitalize ' + statusColors[a.status]}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewsTab businessId={business.id} />
        )}

        {activeTab === 'settings' && (
          <NotificationSettings />
        )}

      </div>
    </div>
  )
}
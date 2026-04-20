import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReviewForm from './Reviews'

export default function ClientDashboard() {
  const navigate = useNavigate()
  const client = JSON.parse(localStorage.getItem('client') || '{}')
  const token = localStorage.getItem('clientToken')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [reviewingId, setReviewingId] = useState(null)

  useEffect(() => {
    if (!token) {
      navigate('/client')
      return
    }
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/appointments/my', {
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

  const handleCancel = async (id) => {
    const reason = prompt('Reason for cancellation (optional):')
    try {
      const res = await fetch('http://localhost:8000/api/appointments/cancel/' + id, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || '' })
      })
      const data = await res.json()
      if (res.ok) {
        fetchAppointments()
      } else {
        alert(data.message)
      }
    } catch (err) {
      alert('Something went wrong')
    }
  }

  const handleReschedule = async (id) => {
    const newDate = prompt('Enter new date and time (e.g. 2026-05-01T10:00):')
    if (!newDate) return
    try {
      const res = await fetch('http://localhost:8000/api/appointments/reschedule/' + id, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: newDate })
      })
      const data = await res.json()
      if (res.ok) {
        fetchAppointments()
      } else {
        alert(data.message)
      }
    } catch (err) {
      alert('Something went wrong')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('clientToken')
    localStorage.removeItem('client')
    navigate('/client')
  }

  const statusColors = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-rose-50 text-rose-700',
    rescheduled: 'bg-amber-50 text-amber-700',
    completed: 'bg-blue-50 text-blue-700',
    'no-show': 'bg-slate-100 text-slate-600'
  }

  const upcomingAppts = appointments.filter(a =>
    new Date(a.date) > new Date() && a.status !== 'cancelled'
  )
  const pastAppts = appointments.filter(a =>
    new Date(a.date) <= new Date() || a.status === 'cancelled'
  )

  return (
    <div className="min-h-screen bg-slate-50">

      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-8 h-8 bg-indigo-600 group-hover:bg-indigo-700 rounded-lg flex items-center justify-center transition">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800 group-hover:text-indigo-600 transition">AppointEase</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-600 text-sm hidden md:block">{client.name}</span>
          <button
            onClick={() => navigate('/client/book/search')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Book appointment
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-rose-500 hover:text-rose-600 font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">My appointments</h1>
          <p className="text-slate-500 mt-1">Manage all your upcoming and past appointments</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">Upcoming</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{upcomingAppts.length}</p>
            <p className="text-slate-400 text-xs mt-1">appointments</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-slate-500 text-sm">Total booked</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{appointments.length}</p>
            <p className="text-slate-400 text-xs mt-1">all time</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {['upcoming', 'past'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition capitalize ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 capitalize">{activeTab} appointments</h2>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-slate-400">Loading...</div>
          ) : (activeTab === 'upcoming' ? upcomingAppts : pastAppts).length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-400 text-lg">No {activeTab} appointments</p>
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => navigate('/client/book/search')}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
                >
                  Book your first appointment
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(activeTab === 'upcoming' ? upcomingAppts : pastAppts).map(a => (
                <div key={a._id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 font-semibold text-sm">
                          {a.business?.name?.charAt(0) || 'B'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{a.business?.name || 'Business'}</p>
                        <p className="text-slate-500 text-sm">{a.service}</p>
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

                  {activeTab === 'upcoming' && a.status !== 'cancelled' && (
                    <div className="flex gap-2 mt-3 ml-14">
                      <button
                        onClick={() => handleReschedule(a._id)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancel(a._id)}
                        className="text-xs font-medium text-rose-500 hover:text-rose-600 border border-rose-200 hover:border-rose-400 px-3 py-1.5 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {activeTab === 'past' && a.status !== 'cancelled' && (
                    <div className="mt-3 ml-14">
                      {reviewingId === a._id ? (
                        <ReviewForm
                          appointmentId={a._id}
                          businessId={a.business?._id}
                          onSuccess={() => { setReviewingId(null); fetchAppointments() }}
                        />
                      ) : (
                        <button
                          onClick={() => setReviewingId(a._id)}
                          className="text-xs font-medium text-amber-600 hover:text-amber-700 border border-amber-200 hover:border-amber-400 px-3 py-1.5 rounded-lg transition"
                        >
                          Leave a review ★
                        </button>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
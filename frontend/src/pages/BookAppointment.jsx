import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function BookAppointment() {
  const navigate = useNavigate()
  const token = localStorage.getItem('clientToken')
  const [businesses, setBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [service, setService] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    if (!token) {
      navigate('/client')
      return
    }
    fetchBusinesses()
  }, [search, category])

  const fetchBusinesses = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (category !== 'all') params.append('category', category)
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/businesses?' + params)
      const data = await res.json()
      setBusinesses(data)
    } catch (err) {
      console.log(err)
    }
  }

  const handleBook = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const dateTime = date + 'T' + time
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/appointments/book', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          businessId: selectedBusiness._id,
          service,
          date: dateTime
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message)
        setLoading(false)
        return
      }
      setSuccess(true)
      setLoading(false)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const categoryLabels = {
    all: 'All categories',
    salon: 'Hair Salon',
    barbershop: 'Barbershop',
    dental: 'Dental',
    doctor: 'Doctor',
    lawyer: 'Lawyer',
    other: 'Other'
  }

  const categoryIcons = {
    salon: '💇',
    barbershop: '✂️',
    dental: '🦷',
    doctor: '🩺',
    lawyer: '⚖️',
    other: '🏢'
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 16l7 7 13-13" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Appointment booked!</h2>
          <p className="text-slate-500 mb-2">Your appointment at <strong>{selectedBusiness?.name}</strong> has been confirmed.</p>
          <p className="text-slate-400 text-sm mb-8">You will receive a reminder by SMS and email before your appointment.</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/client/dashboard')}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition"
            >
              View my appointments
            </button>
            <button
              onClick={() => { setSuccess(false); setSelectedBusiness(null); setService(''); setDate(''); setTime('') }}
              className="flex-1 border border-slate-300 text-slate-600 hover:border-indigo-300 font-semibold py-2.5 rounded-xl transition"
            >
              Book another
            </button>
          </div>
        </div>
      </div>
    )
  }

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
        <button
          onClick={() => navigate('/client/dashboard')}
          className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition"
        >
          Back to dashboard
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {!selectedBusiness ? (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800">Find a business</h1>
              <p className="text-slate-500 mt-1">Search and book appointments with local businesses</p>
            </div>

            <div className="flex gap-3 mb-6 flex-wrap">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by business name..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {Object.entries(categoryLabels).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setCategory(val)}
                  className={'px-4 py-2 rounded-full text-sm font-medium transition ' + (
                    category === val
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                  )}
                >
                  {val !== 'all' && categoryIcons[val]} {label}
                </button>
              ))}
            </div>

            {businesses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-slate-400 text-lg">No businesses found</p>
                <p className="text-slate-300 text-sm mt-1">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {businesses.map(b => (
                  <div
                    key={b._id}
                    onClick={() => setSelectedBusiness(b)}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-6 cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center transition text-2xl">
                        {categoryIcons[b.category] || '🏢'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition">{b.name}</p>
                        <p className="text-slate-500 text-sm">{categoryLabels[b.category] || b.category}</p>
                        {b.phone && <p className="text-slate-400 text-xs mt-1">{b.phone}</p>}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-indigo-600 text-sm font-medium group-hover:underline">Book appointment →</span>
                      <div className="flex items-center gap-1">
                        {b.totalReviews > 0 ? (
                          <>
                            <span className="text-amber-400 text-sm">{'★'.repeat(Math.round(b.avgRating))}</span>
                            <span className="text-slate-600 text-xs font-medium">{b.avgRating}</span>
                            <span className="text-slate-400 text-xs">({b.totalReviews})</span>
                          </>
                        ) : (
                          <span className="text-slate-300 text-xs">No reviews yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md">
            <button
              onClick={() => setSelectedBusiness(null)}
              className="text-sm text-slate-500 hover:text-indigo-600 font-medium mb-6 transition"
            >
              ← Choose different business
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl">
                  {categoryIcons[selectedBusiness.category] || '🏢'}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{selectedBusiness.name}</p>
                  <p className="text-slate-500 text-sm">{categoryLabels[selectedBusiness.category]}</p>
                  {selectedBusiness.phone && <p className="text-slate-400 text-xs mt-1">{selectedBusiness.phone}</p>}
                  {selectedBusiness.totalReviews > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-amber-400 text-sm">{'★'.repeat(Math.round(selectedBusiness.avgRating))}</span>
                      <span className="text-slate-600 text-xs">{selectedBusiness.avgRating} ({selectedBusiness.totalReviews} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service needed</label>
                <input
                  type="text"
                  value={service}
                  onChange={e => setService(e.target.value)}
                  placeholder="e.g. Haircut, Cleaning, Consultation"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Booking...' : 'Confirm appointment'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
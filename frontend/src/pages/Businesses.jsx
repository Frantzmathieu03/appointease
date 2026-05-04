import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Businesses() {
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [category, setCategory] = useState('all')

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

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const fetchBusinesses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (city) params.append('city', city)
      if (zipCode) params.append('zipCode', zipCode)
      if (category !== 'all') params.append('category', category)
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/businesses?' + params)
      const data = await res.json()
      setBusinesses(data)
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchBusinesses()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-slate-800">AppointEase</span>
        </div>
        <button onClick={() => navigate('/client')} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
          Sign in to book
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Find a business near you</h1>
          <p className="text-slate-500">Search by name, city, or zip code to find and book appointments instantly</p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Business name..."
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City..."
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Zip code..."
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {Object.entries(categoryLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition">
            Search businesses
          </button>
        </form>

        <div className="flex gap-2 mb-6 flex-wrap">
          {Object.entries(categoryLabels).map(([val, label]) => (
            <button key={val} onClick={() => { setCategory(val); setTimeout(fetchBusinesses, 0) }}
              className={'px-4 py-2 rounded-full text-sm font-medium transition ' + (
                category === val ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
              )}>
              {val !== 'all' && categoryIcons[val]} {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Loading businesses...</div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-400 text-lg">No businesses found</p>
            <p className="text-slate-300 text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businesses.map(b => (
              <div key={b._id} className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-6 transition group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center text-2xl transition">
                    {categoryIcons[b.category] || '🏢'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition">{b.name}</p>
                    <p className="text-slate-500 text-sm">{categoryLabels[b.category] || b.category}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  {(b.city || b.state) && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>📍</span>
                      <span>{[b.address, b.city, b.state, b.zipCode].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>📞</span>
                      <a href={'tel:' + b.phone} className="text-indigo-600 hover:underline">{b.phone}</a>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>✉️</span>
                      <a href={'mailto:' + b.email} className="text-indigo-600 hover:underline">{b.email}</a>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {b.totalReviews > 0 ? (
                      <>
                        <span className="text-amber-400">{'★'.repeat(Math.round(b.avgRating))}</span>
                        <span className="text-slate-600 text-xs font-medium">{b.avgRating}</span>
                        <span className="text-slate-400 text-xs">({b.totalReviews})</span>
                      </>
                    ) : (
                      <span className="text-slate-300 text-xs">No reviews yet</span>
                    )}
                  </div>
                  <button onClick={() => navigate('/client')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
                    Book now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

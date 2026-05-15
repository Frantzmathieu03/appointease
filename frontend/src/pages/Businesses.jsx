import Logo from '../Logo'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Businesses() {
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  const categories = [
    { value: '', label: 'All' },
    { value: 'salon', label: 'Hair Salon' },
    { value: 'barbershop', label: 'Barbershop' },
    { value: 'dental', label: 'Dental' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'lawyer', label: 'Lawyer' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => { fetchBusinesses() }, [search, category])

  const fetchBusinesses = async () => {
    try {
      let url = 'https://appointease-03wm.onrender.com/api/auth/businesses?'
      if (search) url += 'search=' + search + '&'
      if (category) url += 'category=' + category
      const res = await fetch(url)
      const data = await res.json()
      setBusinesses(data)
      setLoading(false)
    } catch (err) { setLoading(false) }
  }

  const categoryLabels = { salon: 'Hair Salon', barbershop: 'Barbershop', dental: 'Dental', doctor: 'Doctor', lawyer: 'Lawyer', other: 'Other' }

  return (
    <div className='min-h-screen bg-slate-50'>
      <nav className='bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50'>
        <div className='cursor-pointer' onClick={() => navigate('/')}><Logo /></div>
        <button onClick={() => navigate('/client')} className='bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition'>Sign in to book</button>
      </nav>
      <div className='max-w-6xl mx-auto px-6 py-10'>
        <div className='text-center mb-10'>
          <h1 className='text-3xl font-bold text-slate-800 mb-3'>Find a business near you</h1>
          <p className='text-slate-500'>Book appointments with local businesses instantly</p>
        </div>
        <div className='flex gap-3 mb-6 flex-wrap'>
          <input type='text' placeholder='Search businesses...' value={search} onChange={e => setSearch(e.target.value)} className='flex-1 min-w-48 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white' />
        </div>
        <div className='flex gap-2 mb-6 flex-wrap'>
          {categories.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)} className={'px-4 py-2 rounded-full text-sm font-medium transition ' + (category === c.value ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300')}>{c.label}</button>
          ))}
        </div>
        {loading ? (
          <div className='text-center py-20 text-slate-400'>Loading businesses...</div>
        ) : businesses.length === 0 ? (
          <div className='text-center py-20 text-slate-400'>No businesses found</div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {businesses.map(b => (
              <div key={b._id} className='bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition cursor-pointer' onClick={() => navigate('/book/' + b._id).replace(/s+/g, '-'))}>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl'>
                    {b.category === 'salon' ? '💇' : b.category === 'barbershop' ? '✂️' : b.category === 'dental' ? '🦷' : b.category === 'doctor' ? '🩺' : b.category === 'lawyer' ? '⚖️' : '🏢'}
                  </div>
                  <div>
                    <h3 className='font-bold text-slate-800'>{b.name}</h3>
                    <p className='text-slate-500 text-sm'>{categoryLabels[b.category] || b.category}</p>
                  </div>
                </div>
                {(b.city || b.state) && <p className='text-slate-400 text-sm mb-4'>📍 {[b.city, b.state].filter(Boolean).join(', ')}</p>}
                <button className='w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition text-sm'>Book appointment</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

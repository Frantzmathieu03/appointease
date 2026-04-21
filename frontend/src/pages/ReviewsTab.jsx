import { useState, useEffect } from 'react'

export default function ReviewsTab({ businessId }) {
  const [reviews, setReviews] = useState([])
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/reviews/' + businessId)
      const data = await res.json()
      setReviews(data.reviews)
      setAvgRating(data.avgRating)
      setTotalReviews(data.totalReviews)
      setLoading(false)
    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Client reviews</h2>
        {totalReviews > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">{'★'.repeat(Math.round(avgRating))}</span>
            <span className="font-bold text-slate-800">{avgRating}</span>
            <span className="text-slate-400 text-sm">({totalReviews} reviews)</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="px-6 py-12 text-center text-slate-400">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-slate-400 text-lg">No reviews yet</p>
          <p className="text-slate-300 text-sm mt-1">Reviews will appear here when clients leave feedback</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {reviews.map(r => (
            <div key={r._id} className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold text-xs">
                      {r.client?.name?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <span className="font-medium text-slate-800 text-sm">{r.client?.name || 'Client'}</span>
                </div>
                <span className="text-slate-400 text-xs">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="text-amber-400 text-sm mb-1">{renderStars(r.rating)}</div>
              {r.comment && (
                <p className="text-slate-600 text-sm">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
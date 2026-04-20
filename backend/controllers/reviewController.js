const Review = require('../models/Review')
const Appointment = require('../models/Appointment')

exports.submitReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment } = req.body

    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }

    if (appointment.client.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    const existing = await Review.findOne({ appointment: appointmentId })
    if (existing) {
      return res.status(400).json({ message: 'You already reviewed this appointment' })
    }

    const review = await Review.create({
      business: appointment.business,
      client: req.user.id,
      appointment: appointmentId,
      rating,
      comment
    })

    res.status(201).json({ message: 'Review submitted!', review })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.getBusinessReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ business: req.params.businessId })
      .populate('client', 'name')
      .sort({ createdAt: -1 })

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    res.status(200).json({
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length
    })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}
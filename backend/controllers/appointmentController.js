const Appointment = require('../models/Appointment')
const Business = require('../models/Business')

exports.bookAppointment = async (req, res) => {
  try {
    const { businessId, service, date } = req.body

    const business = await Business.findById(businessId)
    if (!business) {
      return res.status(404).json({ message: 'Business not found' })
    }

    const appointment = await Appointment.create({
      business: businessId,
      client: req.user.id,
      service,
      date,
      status: 'confirmed'
    })

    res.status(201).json({ message: 'Appointment booked!', appointment })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ client: req.user.id })
      .populate('business', 'name phone email')
      .sort({ date: 1 })

    res.status(200).json(appointments)

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.getBusinessAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ business: req.user.id })
      .populate('client', 'name email phone')
      .sort({ date: 1 })

    res.status(200).json(appointments)

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }

    if (appointment.client.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    appointment.status = 'cancelled'
    appointment.cancellationReason = req.body.reason || ''
    await appointment.save()

    res.status(200).json({ message: 'Appointment cancelled', appointment })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.rescheduleAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' })
    }

    if (appointment.client.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    appointment.date = req.body.date
    appointment.status = 'rescheduled'
    await appointment.save()

    res.status(200).json({ message: 'Appointment rescheduled', appointment })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}
const mongoose = require('mongoose')

const appointmentSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'rescheduled', 'completed', 'no-show'],
    default: 'confirmed'
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  remindersSent: {
    twentyFourHour: { type: Boolean, default: false },
    twoHour: { type: Boolean, default: false }
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true })

module.exports = mongoose.model('Appointment', appointmentSchema)
const mongoose = require('mongoose')

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['salon', 'barbershop', 'dental', 'doctor', 'lawyer', 'other'],
    required: true
  },
  notifications: {
    channels: {
      sms: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    reminders: [
      {
        value: { type: Number, default: 24 },
        unit: { type: String, enum: ['minutes', 'hours', 'days'], default: 'hours' }
      }
    ],
    customMessage: {
      type: String,
      default: 'Hi {client_name}, reminder for your appointment at {business_name} on {date} at {time}.'
    }
  }
}, { timestamps: true })

module.exports = mongoose.model('Business', businessSchema)
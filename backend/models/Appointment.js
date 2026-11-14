// Appointments — Postgres table: public.appointments
const { makeModel } = require('./_pg')

module.exports = makeModel({
  table: 'appointments',
  fields: {
    business: 'business_id',
    client: 'client_id',
    service: 'service',
    date: 'starts_at',
    status: 'status',
    cancellationReason: 'cancellation_reason',
    remindersSent: 'reminders_sent',
    notes: 'notes',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  jsonb: ['remindersSent'],
  populates: {
    business: () => require('./Business'),
    client: () => require('./User')
  }
})

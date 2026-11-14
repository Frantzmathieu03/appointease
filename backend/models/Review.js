// Reviews — Postgres table: public.reviews
const { makeModel } = require('./_pg')

module.exports = makeModel({
  table: 'reviews',
  fields: {
    business: 'business_id',
    client: 'client_id',
    appointment: 'appointment_id',
    rating: 'rating',
    comment: 'comment',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  populates: {
    business: () => require('./Business'),
    client: () => require('./User'),
    appointment: () => require('./Appointment')
  }
})

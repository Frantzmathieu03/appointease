// Businesses — Postgres table: public.businesses
const { makeModel } = require('./_pg')

module.exports = makeModel({
  table: 'businesses',
  fields: {
    name: 'name',
    email: 'email',
    password: 'password_hash',
    phone: 'phone',
    category: 'category',
    city: 'city',
    state: 'state',
    zipCode: 'zip_code',
    address: 'address',
    notifications: 'notifications',
    plan: 'plan',
    subscriptionStatus: 'subscription_status',
    stripeCustomerId: 'stripe_customer_id',
    stripeSubscriptionId: 'stripe_subscription_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  jsonb: ['notifications']
})

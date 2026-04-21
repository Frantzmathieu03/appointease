const Stripe = require('stripe')
const Business = require('../models/Business')

exports.createCheckoutSession = async (req, res) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { plan } = req.body

    const prices = {
      starter: process.env.STRIPE_STARTER_PRICE,
      professional: process.env.STRIPE_PRO_PRICE,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE
    }

    const priceId = prices[plan]
    if (!priceId) {
      return res.status(400).json({ message: 'Invalid plan' })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.FRONTEND_URL + '/dashboard?success=true',
      cancel_url: process.env.FRONTEND_URL + '/?canceled=true',
      metadata: { businessId: req.user.id, plan }
    })

    res.status(200).json({ url: session.url })

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const business = await Business.findById(req.user.id)
    res.status(200).json({
      plan: business.plan || 'free',
      status: business.subscriptionStatus || 'inactive'
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.webhook = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return res.status(400).send('Webhook error: ' + err.message)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const businessId = session.metadata.businessId
    const plan = session.metadata.plan

    await Business.findByIdAndUpdate(businessId, {
      plan,
      subscriptionStatus: 'active',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription
    })
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    await Business.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { plan: 'free', subscriptionStatus: 'inactive' }
    )
  }

  res.json({ received: true })
}
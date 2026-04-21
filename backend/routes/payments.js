const express = require('express')
const router = express.Router()
const { createCheckoutSession, getSubscriptionStatus, webhook } = require('../controllers/paymentController')
const protect = require('../middleware/auth')

router.post('/create-checkout', protect, createCheckoutSession)
router.get('/status', protect, getSubscriptionStatus)
router.post('/webhook', express.raw({ type: 'application/json' }), webhook)

module.exports = router
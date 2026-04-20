const express = require('express')
const router = express.Router()
const { submitReview, getBusinessReviews } = require('../controllers/reviewController')
const protect = require('../middleware/auth')

router.post('/submit', protect, submitReview)
router.get('/:businessId', getBusinessReviews)

module.exports = router
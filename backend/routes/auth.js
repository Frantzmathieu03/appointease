const express = require('express')
const router = express.Router()
const {
  businessSignup,
  businessLogin,
  userSignup,
  userLogin,
  getBusinesses
} = require('../controllers/authController')

router.post('/business/signup', businessSignup)
router.post('/business/login', businessLogin)
router.post('/user/signup', userSignup)
router.post('/user/login', userLogin)
router.get('/businesses', getBusinesses)

module.exports = router
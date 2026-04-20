const express = require('express')
const router = express.Router()
const {
  getNotificationSettings,
  updateNotificationSettings
} = require('../controllers/notificationController')
const protect = require('../middleware/auth')

router.get('/settings', protect, getNotificationSettings)
router.put('/settings', protect, updateNotificationSettings)

module.exports = router
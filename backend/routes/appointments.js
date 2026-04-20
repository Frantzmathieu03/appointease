const express = require('express')
const router = express.Router()
const {
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getBusinessAppointments
} = require('../controllers/appointmentController')
const protect = require('../middleware/auth')

router.post('/book', protect, bookAppointment)
router.get('/my', protect, getMyAppointments)
router.get('/business', protect, getBusinessAppointments)
router.put('/cancel/:id', protect, cancelAppointment)
router.put('/reschedule/:id', protect, rescheduleAppointment)

module.exports = router
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const passport = require('passport')

if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

const app = express()

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))

app.use(cors())
app.use(express.json())
app.use(passport.initialize())

const authRoutes = require('./routes/auth')
const appointmentRoutes = require('./routes/appointments')
const notificationRoutes = require('./routes/notifications')
const reviewRoutes = require('./routes/reviews')
const paymentRoutes = require('./routes/payments')
const googleAuthRoutes = require('./routes/googleAuth')
const startScheduler = require('./utils/reminderScheduler')

app.use('/api/auth', authRoutes)
app.use('/api/auth', googleAuthRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/payments', paymentRoutes)

app.get('/', (req, res) => {
  res.send('AppointEase server is running!')
})

const PORT = process.env.PORT || 8000

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected!')
    startScheduler()
    app.listen(PORT, () => {
      console.log('Server running on port ' + PORT)
    })
  })
  .catch((err) => {
    console.log('Connection error:', err)
  })

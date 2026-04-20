const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

const authRoutes = require('./routes/auth')
const appointmentRoutes = require('./routes/appointments')
const notificationRoutes = require('./routes/notifications')
const reviewRoutes = require('./routes/reviews')
const startScheduler = require('./utils/reminderScheduler')

app.use('/api/auth', authRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reviews', reviewRoutes)

app.get('/', (req, res) => {
  res.send('Appointment app server is running!')
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
const cron = require('node-cron')
const Appointment = require('../models/Appointment')
const Business = require('../models/Business')
const User = require('../models/User')
const nodemailer = require('nodemailer')
const twilio = require('twilio')

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const sendEmail = async (to, subject, message) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: message
  })
  console.log(`Email sent to ${to}`)
}

const sendSMS = async (to, message) => {
  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE,
    to
  })
  console.log(`SMS sent to ${to}`)
}

const formatMessage = (template, data) => {
  return template
    .replace('{client_name}', data.clientName)
    .replace('{business_name}', data.businessName)
    .replace('{date}', data.date)
    .replace('{time}', data.time)
    .replace('{service}', data.service)
}

const checkAndSendReminders = async () => {
  try {
    const now = new Date()

    const appointments = await Appointment.find({
      status: { $in: ['confirmed', 'rescheduled'] }
    })
    .populate('business')
    .populate('client')

    for (const appointment of appointments) {
      const apptTime = new Date(appointment.date)
      const diffMs = apptTime - now
      const diffHours = diffMs / (1000 * 60 * 60)

      const business = appointment.business
      const client = appointment.client
      const reminders = business.notifications.reminders
      const channels = business.notifications.channels
      const customMessage = business.notifications.customMessage

      const messageData = {
        clientName: client.name,
        businessName: business.name,
        date: apptTime.toLocaleDateString(),
        time: apptTime.toLocaleTimeString(),
        service: appointment.service
      }

      const finalMessage = formatMessage(customMessage, messageData)

      for (const reminder of reminders) {
        let reminderHours = reminder.value
        if (reminder.unit === 'days') reminderHours = reminder.value * 24
        if (reminder.unit === 'minutes') reminderHours = reminder.value / 60

        const isTime = diffHours <= reminderHours && diffHours > reminderHours - 1

        if (isTime) {
          if (channels.email && client.email) {
            await sendEmail(
              client.email,
              `Reminder: Your appointment at ${business.name}`,
              finalMessage
            )
          }

          if (channels.sms && client.phone) {
            await sendSMS(client.phone, finalMessage)
          }

          if (reminder.value === 24 && reminder.unit === 'hours') {
            appointment.remindersSent.twentyFourHour = true
          }
          if (reminder.value === 2 && reminder.unit === 'hours') {
            appointment.remindersSent.twoHour = true
          }

          await appointment.save()
        }
      }
    }
  } catch (err) {
    console.log('Scheduler error:', err.message)
  }
}

const startScheduler = () => {
  cron.schedule('0 * * * *', () => {
    console.log('Running reminder check...')
    checkAndSendReminders()
  })
  console.log('Reminder scheduler started!')
}

module.exports = startScheduler
const cron = require("node-cron")
const Appointment = require("../models/Appointment")
const Business = require("../models/Business")
const User = require("../models/User")
const twilio = require("twilio")
const { Resend } = require("resend")

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const resend = new Resend(process.env.RESEND_API_KEY)

const sendEmail = async (to, subject, message) => {
  try {
    await resend.emails.send({
      from: "AppointEase <reminders@appointease.io>",
      to,
      subject,
      html: "<p>" + message + "</p>"
    })
    console.log("Email sent to", to)
  } catch (err) {
    console.log("Email error:", err.message)
  }
}

const sendSMS = async (to, message) => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to
    })
    console.log("SMS sent to", to)
  } catch (err) {
    console.log("SMS error:", err.message)
  }
}

const checkReminders = async () => {
  try {
    console.log("Running reminder check...")
    const now = new Date()
    const appointments = await Appointment.find({ status: "confirmed" })
      .populate("business")
      .populate("client")

    for (const appointment of appointments) {
      const apptTime = new Date(appointment.date)
      const diffMs = apptTime - now
      const diffHours = diffMs / (1000 * 60 * 60)
      const business = appointment.business
      const client = appointment.client
      const reminders = business.notifications && business.notifications.reminders ? business.notifications.reminders : [{ value: 24, unit: "hours" }]
      for (const reminder of reminders) {
        let reminderHours = reminder.value
        if (reminder.unit === "days") reminderHours = reminder.value * 24
        if (reminder.unit === "minutes") reminderHours = reminder.value / 60
        const isWithinWindow = diffHours > 0 && diffHours <= reminderHours
        if (isWithinWindow) {
          const dateStr = apptTime.toLocaleDateString()
          const timeStr = apptTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          let msg = (business.notifications && business.notifications.customMessage) || "Hi {client_name}, reminder for your appointment at {business_name} on {date} at {time}."
          msg = msg.replace("{client_name}", client.name).replace("{business_name}", business.name).replace("{date}", dateStr).replace("{time}", timeStr)
          if (client.email) await sendEmail(client.email, "Appointment Reminder - " + business.name, msg)
          if (client.phone) await sendSMS(client.phone, msg + " - AppointEase")
          console.log("Reminder sent for appointment:", appointment._id)
        }
      }
    }
  } catch (err) {
    console.log("Reminder error:", err.message)
  }
}

const startScheduler = () => {
  cron.schedule("* * * * *", checkReminders)
  checkReminders()
}

module.exports = startScheduler

const Business = require('../models/Business')

exports.getNotificationSettings = async (req, res) => {
  try {
    const business = await Business.findById(req.user.id)
    if (!business) {
      return res.status(404).json({ message: 'Business not found' })
    }
    res.status(200).json(business.notifications)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.updateNotificationSettings = async (req, res) => {
  try {
    const { channels, reminders, customMessage } = req.body

    const business = await Business.findById(req.user.id)
    if (!business) {
      return res.status(404).json({ message: 'Business not found' })
    }

    if (channels) business.notifications.channels = channels
    if (reminders) business.notifications.reminders = reminders
    if (customMessage) business.notifications.customMessage = customMessage

    await business.save()

    res.status(200).json({
      message: 'Notification settings updated!',
      notifications: business.notifications
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}
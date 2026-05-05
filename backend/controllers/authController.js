const Business = require('../models/Business')
const User = require('../models/User')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

exports.businessSignup = async (req, res) => {
  try {
    const { name, email, password, phone, category, city, state, zipCode, address } = req.body
    const existing = await Business.findOne({ email })
    if (existing) return res.status(400).json({ message: 'Email already registered' })
    const hashedPassword = await bcrypt.hash(password, 10)
    const business = await Business.create({
      name, email, password: hashedPassword, phone, category,
      city: city || '', state: state || '', zipCode: zipCode || '', address: address || '',
      notifications: {
        channels: { sms: true, email: true },
        reminders: [{ value: 24, unit: 'hours' }],
        customMessage: 'Hi {client_name}, reminder for your appointment at {business_name} on {date} at {time}.'
      }
    })
    const token = jwt.sign({ id: business._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ token, business: { id: business._id, name: business.name, email: business.email } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.businessLogin = async (req, res) => {
  try {
    const { email, password } = req.body
    const business = await Business.findOne({ email })
    if (!business) return res.status(400).json({ message: 'Invalid email or password' })
    const isMatch = await bcrypt.compare(password, business.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' })
    const token = jwt.sign({ id: business._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(200).json({ token, business: { id: business._id, name: business.name, email: business.email } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.userSignup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ message: 'Email already registered' })
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, password: hashedPassword, phone })
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid email or password' })
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' })
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email, type } = req.body
    const Model = type === 'business' ? Business : User
    const user = await Model.findOne({ email })
    if (!user) return res.status(400).json({ message: 'No account found with that email' })
    const resetToken = jwt.sign({ id: user._id, type }, process.env.JWT_SECRET, { expiresIn: '1h' })
    const resetLink = process.env.FRONTEND_URL + '/reset-password?token=' + resetToken + '&type=' + type
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Reset your AppointEase password',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Reset your password</h2>
          <p>You requested a password reset for your AppointEase account.</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Reset Password</a>
          <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
      `
    })
    res.status(200).json({ message: 'Reset link sent to your email!' })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { token, password, type } = req.body
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const Model = type === 'business' ? Business : User
    const hashedPassword = await bcrypt.hash(password, 10)
    await Model.findByIdAndUpdate(decoded.id, { password: hashedPassword })
    res.status(200).json({ message: 'Password reset successfully!' })
  } catch (err) {
    res.status(500).json({ message: 'Invalid or expired reset link' })
  }
}

exports.getBusinesses = async (req, res) => {
  try {
    const { search, category, city, zipCode } = req.query
    let filter = {}
    if (search) filter.name = { $regex: search, $options: 'i' }
    if (category && category !== 'all') filter.category = category
    if (city) filter.city = { $regex: city, $options: 'i' }
    if (zipCode) filter.zipCode = zipCode
    const businesses = await Business.find(filter, 'name category phone email city state zipCode address')
    const Review = require('../models/Review')
    const businessesWithRatings = await Promise.all(
      businesses.map(async (b) => {
        const reviews = await Review.find({ business: b._id })
        const avgRating = reviews.length > 0
          ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
          : 0
        return {
          _id: b._id, name: b.name, category: b.category, phone: b.phone, email: b.email,
          city: b.city, state: b.state, zipCode: b.zipCode, address: b.address,
          avgRating, totalReviews: reviews.length
        }
      })
    )
    res.status(200).json(businessesWithRatings)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

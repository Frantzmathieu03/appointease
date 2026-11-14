// Users (booking clients) — Postgres table: public.users
const { makeModel } = require('./_pg')

module.exports = makeModel({
  table: 'users',
  fields: {
    name: 'name',
    email: 'email',
    password: 'password_hash',
    phone: 'phone',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
})

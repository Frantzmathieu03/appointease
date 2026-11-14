// Postgres connection for AppointEase (Supabase).
// The backend talks to Supabase Postgres directly through DATABASE_URL
// (direct connection, port 5432). SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY are carried in env for later Supabase client
// and Auth work; the data layer below only needs the pool.
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL

const isLocal = !connectionString || /localhost|127\.0\.0\.1/.test(connectionString)

const pool = new Pool({
  connectionString,
  // Supabase requires SSL; local Postgres usually does not offer it.
  ssl: isLocal ? false : { rejectUnauthorized: false }
})

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err)
})

const query = (text, params) => pool.query(text, params)

module.exports = { pool, query }

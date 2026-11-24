# AppointEase

Online booking, automatic reminders, and two-way messaging for
appointment-based businesses — barbershops, salons, dental and medical
offices, law firms, and more.

Every business gets its own booking page at **appointease.io/\<business\>**
(logo, services, hours, address, tap-to-call), a private dashboard
(today's appointments, calendar, customers, inbox), and reminders that go
out by text and email 24 hours and 2 hours before each appointment — each
with a secure link to reschedule or cancel. Customers hold **one account
across all of AppointEase**; every business sees only its own customers,
appointments, and messages (enforced in the database by Row Level
Security).

New messages never sit unseen: unread counts show as badges on both
sides, and the moment a message lands, the other side is alerted by email
(and by text / push where enabled). Every alert attempt is recorded in an
audit log.

---

## Get this code on your Mac (Cursor)

```bash
# 1. Clone THIS branch (the Supabase rebuild)
git clone -b supabase-rebuild https://github.com/Frantzmathieu03/appointease.git appointease
cd appointease

# 2. Open it in Cursor
cursor .
```

## Run it locally

```bash
# 3. Install dependencies
npm install

# 4. Create your local env file from the template
cp .env.example .env.local
#    Fill in the Supabase values (see "Environment" below).
#    Leaving the placeholder values in place runs the site in DEMO MODE:
#    the sample business (Jesus Barber Shop) works end to end on sample
#    data and nothing is saved.

# 5. Start the dev server
npm run dev
#    → http://localhost:3000
```

Useful pages in local dev:

| Page | URL |
|---|---|
| Landing | `/` |
| Sample business page | `/jesus-barber-shop` |
| Booking flow | `/jesus-barber-shop/book` |
| Customer sign-in / sign-up | `/login` · `/signup` |
| My appointments | `/my-appointments` |
| Business sign-in / sign-up | `/owner` · `/owner/signup` |
| Owner setup checklist | `/owner/setup` |
| Owner dashboard | `/owner/dashboard` |

## Environment

All configuration is through env vars (see `.env.example` for the full
annotated list). The important ones:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (Project Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for the reminder engine / manage links |
| `NEXT_PUBLIC_SITE_URL` | Public base URL of the deployment |
| `CRON_SECRET` | Shared secret guarding `/api/cron/reminders` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email sending (reminders + message alerts) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS sending. Until set, SMS attempts are honestly logged as `sms_pending_provider` and email still sends |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push. Until set, push is recorded as skipped (env-gated) |

## Database (Supabase)

Schema lives in `supabase/migrations/`, applied in order:

1. `0001_schema.sql` — businesses, services, staff, availability,
   customers, appointments (with database-level no-double-booking
   constraints), messages, reminders, and all RLS policies.
2. `0002_messaging_notifications.sql` — notifications audit log, Web Push
   subscriptions, reviews, Realtime on messages.

`supabase/seed.sql` loads the Jesus Barber Shop demo business (published,
Mon–Sat 9–6, three services). Demo owner login for a local project:
`owner@jesusbarber.example` / `demo-password` — delete it before real use.

## How reminders & message alerts work

- Booking creates reminder rows: **confirmation** (immediately), **24 h
  before**, **2 h before** — each on email + SMS. Rescheduling re-times
  them; cancelling stops them. A scheduler calls `GET /api/cron/reminders`
  every few minutes (Vercel Cron is configured in `vercel.json`; a
  Supabase Edge Function trigger also lives in `supabase/functions/`).
- All sends route through one dispatcher (`src/lib/dispatch.ts`) over the
  provider layer (`src/lib/notify.ts`: Resend for email, Twilio for SMS).
  A send is only ever marked **sent** when the provider accepted it.
- Chat: customers message from the business page; owners reply from the
  dashboard inbox. Threads update live (Supabase Realtime + polling
  fallback), unread badges show exact counts on both sides, and the first
  unread message of a burst triggers the off-screen alerts above. Every
  attempt lands in `notifications_log`.

## Project layout

```
src/app/            Pages & API routes (Next.js App Router)
  [slug]/           Public business page, /book, /message
  manage/[token]/   Secure reschedule/cancel link page
  owner/            Business sign-in, signup, setup, dashboard
  my-appointments/  Customer appointments home
  api/              book, slots, manage, messages, reviews, cron
src/lib/            Supabase clients, slot engine, reminders, dispatcher
src/components/     Booking flow, chat thread, badges, owner managers
supabase/           Migrations, seed, Edge Function trigger
public/             PWA manifest + push service worker
```

## Pricing (business plans)

30-day free trial, no card upfront. Then, by team size: **Solo $19/mo**
(1 team member) · **Team $39/mo** (up to 5) · **Business $79/mo** (up to
15). Paid checkout (Stripe) is the next phase; trial businesses keep
running until it lands.

## Status

v1: booking, accounts, owner setup + dashboard, reminders, two-way chat
with notifications, reviews. Phase 2: Stripe billing, per-staff hours &
service assignment in the UI, intake forms, automated after-hours reply.

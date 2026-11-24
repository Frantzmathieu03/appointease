# AppointEase — Supabase Setup Runbook

Purpose: stand up the AppointEase production database on Supabase and cut the
app over from MongoDB to Postgres. The code side is already staged on the
GitHub branch `supabase-rebuild` (repo `Frantzmathieu03/appointease`).
**Nothing here goes live until the owner's cutover go (step 6).**

---

## 1. Owner step — create the Supabase project (only the owner can do this)

Same flow as the MECHA project:

1. Go to supabase.com and sign in with **Continue with GitHub** (the account
   that owns the project — do NOT try email/password; there is no password
   login for this account).
2. New organization (or reuse): name it **AppointEase**. Free plan is fine to
   start.
3. New project:
   - Name: **appointease-production**
   - Region: **East US (North Virginia) / us-east-1**
   - Database password: set a NEW strong password through the Secure Vault
     card flow (never in chat). This password is for the DATABASE only — it
     is not a website login.
4. Wait for the project to show **Healthy**.
5. From the project dashboard, collect (Project Settings → API, and
   Settings → Database → Connection string):
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` public key
   - `service_role` secret key
   - The **direct** connection string (port **5432**) — this becomes
     `DATABASE_URL`. Have these ready to hand over; keys go into host env
     settings, never into the repo or chat files.

## 2. Apply the schema

From a checkout of branch `supabase-rebuild`, with the project's SQL editor
(or `psql "$DATABASE_URL"`), apply in order:

1. `supabase/migrations/20261114000001_initial_schema.sql`
2. `supabase/migrations/20261114000002_rls_policies.sql`

Expected result: tables `users`, `businesses`, `appointments`, `reviews`,
`notification_log`; RLS enabled on all five.

## 3. Environment values — what goes where

Backend host (Render service for `backend/`), set in its env settings:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The step-1 direct connection string (port 5432). Replaces `MONGO_URI` — delete `MONGO_URI` at cutover. |
| `SUPABASE_URL` | Project URL (reserved for later Supabase client/Auth use) |
| `SUPABASE_ANON_KEY` | anon public key (same) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — server only, never in the frontend |
| `JWT_SECRET` | **Keep the existing value** so current logins survive the cutover |
| `FRONTEND_URL` | The live frontend origin (existing value) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_STARTER_PRICE`, `STRIPE_PRO_PRICE`, `STRIPE_ENTERPRISE_PRICE` | Existing values, unchanged |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE` | Existing values, unchanged |
| `RESEND_API_KEY` | Existing value, unchanged |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Existing values (used when Google sign-in is repaired in phase 2) |
| `PORT` | Host-provided (existing behavior) |

`backend/.env.example` on the branch lists every one of these as placeholders.

Frontend: no env needed for this cutover — the API URL stays the existing
Render address on this pass (env-driven API config is phase-2 work).

## 4. Data move (only if the Mongo database has real users)

If MongoDB holds real businesses/clients worth keeping, run the export →
transform → import in REBUILD_PLAN.md §5 with the same field mapping (ids are
re-minted as uuids; bcrypt hashes carry over). If the Mongo data is test data,
skip this entirely and start clean — say so explicitly at the gate.

## 5. Parity checks (all must pass before the gate)

Against the staging deploy of `supabase-rebuild` pointed at the new database:

- [ ] `GET /api/health` returns `{ status: 'ok' }`.
- [ ] Business signup → 201 with token; duplicate email → 400.
- [ ] Business login with the new credentials → 200.
- [ ] Client signup + login → 200.
- [ ] Client books an appointment → 201; it appears in `GET /api/appointments/my`
      with the business name populated, and in `GET /api/appointments/business`
      with the client name populated.
- [ ] Cancel + reschedule round-trip updates status/date.
- [ ] Review submit → 201; second review on the same appointment → 400;
      `GET /api/reviews/:businessId` shows it with the right average.
- [ ] Directory: `GET /api/auth/businesses` lists the business with rating
      fields; the public booking link (full id and last-6 slug) resolves it.
- [ ] Notification settings GET/PUT round-trip persists.
- [ ] Payments: `GET /api/payments/status` returns the plan; Stripe
      test-mode checkout completes and the webhook flips the plan to active
      (check the `businesses` row).
- [ ] Row counts: after any data import, `users` / `businesses` /
      `appointments` / `reviews` counts match the Mongo export counts.
- [ ] Reminder scheduler boots with the server (log line) — send check is a
      post-cutover observation, not a gate item.

## 6. Cutover gate — owner's go required

Cutover happens ONLY on the owner's explicit go, in this order:

1. Owner confirms: data move needed or starting clean.
2. Merge `supabase-rebuild` → `main` (owner approves the merge).
3. Set the step-3 env values on the backend host; remove `MONGO_URI`.
4. Deploy; run the step-5 checks against production.
5. Rollback if anything fails: revert env to `MONGO_URI` + redeploy `main`
   pre-merge — the old code and database are untouched until this moment.

## 7. After cutover (phase 2, separate orders)

Google sign-in repair, env-driven frontend API URL, dead-code removal
(root `server.js`, Clerk dependency, duplicate Vercel configs), security
hardening, Supabase Auth evaluation, Supabase Storage for business photos.
See REBUILD_PLAN.md §6.

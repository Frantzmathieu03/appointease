-- AppointEase migration 0016 — Customer Side Plan (Frantz, 2026-11-26):
-- the business's own booking rules + the customer's texting consent.
--
--   * businesses.cancellation_policy — the business's own words for
--     cancelling, edited in Settings under the plain label
--     "Late-cancellation note" and shown on the booking Review and
--     the cancel screen. NULL = the app shows its friendly standard
--     note ("please cancel at least 24 hours before when you can…
--     There's nothing to pay online."). Words only — the business
--     collects any fee itself; AppointEase never charges clients.
--
--   * businesses.reschedule_cutoff_hours (default 12) — inside this
--     many hours of the appointment, the reschedule screen stops
--     offering times and asks the customer to call the office.
--
--   * businesses.cancel_window_hours (default 24) — the free
--     cancellation window the settings screen names; informational
--     for the business's own note (the cancel screen itself follows
--     cancellation_policy / the standard note).
--
--   * business_customers.sms_consent_at — when the customer ticked
--     "Text me reminders and replies. Reply STOP anytime." on this
--     business's sign-up screen. Per business, like everything else
--     about the membership. NULL = never consented (the box starts
--     unchecked).
--
-- Safe to run before or after the Phase 3 app deploy: every read of
-- these columns in the app is feature-detected and falls back to the
-- defaults (no policy words, 12 / 24 hours, no consent) until this
-- lands.

alter table public.businesses
  add column if not exists cancellation_policy text;

alter table public.businesses
  add column if not exists reschedule_cutoff_hours integer not null default 12;

alter table public.businesses
  add column if not exists cancel_window_hours integer not null default 24;

alter table public.business_customers
  add column if not exists sms_consent_at timestamptz;

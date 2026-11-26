-- AppointEase migration 0017 — Mobile app devices + notification prefs
-- (AppointEase App Pieces spec, Frantz 2026-11-26; app build phase 1).
--
--   * public.device_tokens — one row per signed-in device running the
--     native app (Capacitor). The app upserts its push token after
--     sign in; the server push helper reads these rows to deliver
--     native notifications (FCM / APNs). business_id is the business
--     context the device was last used with (nullable — a login can
--     exist before a business is picked).
--
--   * public.notification_prefs — one row per user with the four
--     notification toggles from the spec (More → Notifications):
--     new booking, new message, appointment cancelled, morning
--     summary. No row = all four on (the defaults below). The send
--     path reads these before pushing; staff-only-own-clients is
--     enforced by the send path, not by these toggles.
--
-- RLS: a signed-in user can read / insert / update / delete ONLY
-- their own rows in both tables (auth.uid() = user_id). The server
-- push helper uses the service role and bypasses RLS as usual.
--
-- Safe to run before or after the app deploy: every read/write of
-- these tables in the app is feature-detected and no-ops quietly
-- until this lands (same pattern as migrations 0010–0016).

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index device_tokens_user_idx on public.device_tokens (user_id);
create index device_tokens_business_idx on public.device_tokens (business_id);

create table public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  new_booking boolean not null default true,
  new_message boolean not null default true,
  cancelled boolean not null default true,
  morning_summary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security — self only.
-- ---------------------------------------------------------------------------
alter table public.device_tokens enable row level security;
alter table public.notification_prefs enable row level security;

create policy device_tokens_select_own on public.device_tokens
  for select to authenticated
  using (auth.uid() = user_id);

create policy device_tokens_insert_own on public.device_tokens
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy device_tokens_update_own on public.device_tokens
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy device_tokens_delete_own on public.device_tokens
  for delete to authenticated
  using (auth.uid() = user_id);

create policy notification_prefs_select_own on public.notification_prefs
  for select to authenticated
  using (auth.uid() = user_id);

create policy notification_prefs_insert_own on public.notification_prefs
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy notification_prefs_update_own on public.notification_prefs
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy notification_prefs_delete_own on public.notification_prefs
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (same pattern as 0003/0010/0011): RLS above is the isolation
-- layer — these only open the door the policies then guard.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.device_tokens, public.notification_prefs
  to anon, authenticated, service_role;

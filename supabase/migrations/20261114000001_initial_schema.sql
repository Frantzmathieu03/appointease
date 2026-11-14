-- AppointEase — initial Supabase Postgres schema
-- Migrates the four MongoDB collections (users, businesses, appointments,
-- reviews) to Postgres and adds notification_log for reminder auditing.
-- Field mapping: see REBUILD_PLAN.md section 3. Mongo ObjectIds become uuids;
-- the API layer exposes each row's id as "_id" so the frontend is unchanged.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users (clients who book appointments)
-- ---------------------------------------------------------------------------
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  phone         text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- businesses (the paying customers of AppointEase)
-- ---------------------------------------------------------------------------
create table public.businesses (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  email                  text not null unique,
  password_hash          text not null,
  phone                  text not null,
  category               text not null check (category in ('salon', 'barbershop', 'dental', 'doctor', 'lawyer', 'other')),
  city                   text not null default '',
  state                  text not null default '',
  zip_code               text not null default '',
  address                text not null default '',
  notifications          jsonb not null default '{"channels": {"sms": true, "email": true}, "reminders": [{"value": 24, "unit": "hours"}], "customMessage": "Hi {client_name}, reminder for your appointment at {business_name} on {date} at {time}."}'::jsonb,
  plan                   text not null default 'free' check (plan in ('free', 'starter', 'professional', 'enterprise')),
  subscription_status    text not null default 'inactive' check (subscription_status in ('active', 'inactive', 'trialing')),
  stripe_customer_id     text not null default '',
  stripe_subscription_id text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index businesses_stripe_subscription_id_idx
  on public.businesses (stripe_subscription_id);

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses (id) on delete cascade,
  client_id           uuid not null references public.users (id) on delete cascade,
  service             text not null,
  starts_at           timestamptz not null,
  status              text not null default 'confirmed'
                      check (status in ('confirmed', 'cancelled', 'rescheduled', 'completed', 'no-show')),
  cancellation_reason text not null default '',
  reminders_sent      jsonb not null default '{"twentyFourHour": false, "twoHour": false}'::jsonb,
  notes               text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index appointments_business_id_idx on public.appointments (business_id);
create index appointments_client_id_idx on public.appointments (client_id);
create index appointments_status_starts_at_idx on public.appointments (status, starts_at);

-- ---------------------------------------------------------------------------
-- reviews (one per appointment — the unique constraint makes the old
-- application-level check a database guarantee)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  client_id      uuid not null references public.users (id) on delete cascade,
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  rating         integer not null check (rating between 1 and 5),
  comment        text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index reviews_business_id_idx on public.reviews (business_id);

-- ---------------------------------------------------------------------------
-- notification_log (audit trail for reminder email/SMS sends; written by the
-- reminder scheduler from phase 2 — the table ships now so the data model is
-- complete for selling "reminders that provably send")
-- ---------------------------------------------------------------------------
create table public.notification_log (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  channel        text not null check (channel in ('email', 'sms')),
  kind           text not null default 'reminder',
  recipient      text not null default '',
  sent_at        timestamptz not null default now()
);

create index notification_log_business_id_idx on public.notification_log (business_id);

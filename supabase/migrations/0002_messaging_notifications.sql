-- AppointEase migration 0002 — messaging notifications, reviews, web push.
-- Run after 0001_schema.sql.
--
-- Owner requirement (2026-11-24): a new message must never sit unseen.
-- In-app unread badges (Realtime + counts) PLUS off-screen alerts
-- (email / SMS / Web Push) dispatched server-side, with every attempt
-- recorded in notifications_log so delivery is auditable.

-- Cancellation reason, carried over from the old app's appointment record.
alter table public.appointments
  add column if not exists cancellation_reason text;

-- ---------------------------------------------------------------------------
-- notifications_log: one row per off-screen notification attempt.
-- status values: sent | skipped | failed | sms_pending_provider |
--                burst_suppressed
-- ("sms_pending_provider" = Twilio env not configured yet; nothing was sent
-- and nothing is claimed as sent.)
-- Appointment reminders keep their own audit table (public.reminders);
-- this log covers message alerts.
-- ---------------------------------------------------------------------------
create table public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'new_message',
  business_id uuid references public.businesses (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  recipient_user_id uuid,
  channel text not null check (channel in ('email', 'sms', 'push')),
  recipient text,
  status text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index notifications_log_thread_idx
  on public.notifications_log (business_id, customer_id, created_at);

alter table public.notifications_log enable row level security;
-- No client policies on purpose: the dispatcher writes with the service
-- role; the log is an operator audit trail, not client-readable data.

-- ---------------------------------------------------------------------------
-- push_subscriptions: one row per browser/device a user opted in on.
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_self on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- reviews: carried over from the old MERN app — one review per appointment,
-- written only by that appointment's customer; publicly readable so a
-- business page can show its average and recent reviews.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index reviews_business_idx on public.reviews (business_id, created_at);

alter table public.reviews enable row level security;

create policy reviews_public_read on public.reviews
  for select using (true);

create policy reviews_customer_insert on public.reviews
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = reviews.appointment_id
        and a.customer_id = auth.uid()
        and a.business_id = reviews.business_id
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: unread badges and live threads subscribe to message inserts.
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

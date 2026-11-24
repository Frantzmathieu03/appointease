-- AppointEase migration 0004 — Stripe subscription billing.
-- Run after 0001 + 0002 + 0003.
--
-- Businesses subscribe to AppointEase (Solo / Team / Business — see
-- src/lib/plans.ts). Customers who book never pay anything. Billing state
-- lives on the businesses row so gating (src/lib/plans.ts getBillingState)
-- is one read: while a business is trialing or its subscription is active
-- the booking page is live; a lapsed subscription gets a 3-day grace
-- (billing_lapsed_at + 3 days) before the page pauses. Data is never
-- deleted by billing — pausing only stops NEW public bookings.

alter table public.businesses
  add column if not exists plan text not null default 'solo',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists billing_lapsed_at timestamptz;

-- Plan values are the plan ids from src/lib/plans.ts.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_plan_check'
  ) then
    alter table public.businesses
      add constraint businesses_plan_check check (plan in ('solo', 'team', 'business'));
  end if;
end $$;

create unique index if not exists businesses_stripe_customer_id_idx
  on public.businesses (stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists businesses_stripe_subscription_id_idx
  on public.businesses (stripe_subscription_id) where stripe_subscription_id is not null;

-- Webhook idempotency: every Stripe event id is recorded once; a redelivery
-- hits the primary key and the handler skips re-processing. Service-role
-- only — RLS is on with NO client policies, so anon/authenticated can
-- never read or write this table.
create table if not exists public.stripe_events (
  id text primary key, -- Stripe event id (evt_…)
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

-- Grants pattern (same as 0003_grants.sql): table-level grants open the
-- door; RLS policies remain the isolation layer. businesses keeps its
-- 0001 policies (owners read/update their own row; the webhook writes via
-- the service role, which bypasses RLS).
grant select, insert, update, delete
  on public.businesses
  to anon, authenticated, service_role;

grant select, insert, update, delete
  on public.stripe_events
  to service_role;

-- AppointEase v1 schema
-- Multi-tenant: every business is a tenant. Customers are global identities
-- (one account across the whole platform); each business only ever sees its
-- own relationships, appointments and messages. Row Level Security enforces
-- that isolation — the app never filters by hand where a policy can do it.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- for the no-double-booking exclusion constraint

-- ---------------------------------------------------------------------------
-- Customers: one row per Supabase Auth user who books appointments.
-- (Business owners are also auth users; ownership lives on businesses.)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Businesses: one tenant. The slug is reserved at owner signup and is the
-- public link: appointease.io/<slug>
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  name text not null,
  type text not null default 'Other',
  logo_url text,
  description text,
  address text,
  phone text,
  email text,
  timezone text not null default 'America/New_York',
  published boolean not null default false,
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

-- Services a business offers.
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents int not null default 0 check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Staff / team members (calendars). Plan size is measured in staff count.
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Which services each staff member can perform (empty = performs all).
create table public.staff_services (
  staff_id uuid not null references public.staff (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (staff_id, service_id)
);

-- Weekly opening hours. weekday: 0 = Sunday … 6 = Saturday.
-- staff_id null = business-wide hours; a staff row overrides for that person.
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid references public.staff (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  open_time time not null,
  close_time time not null,
  check (close_time > open_time)
);

-- Per-business view of a global customer. Created the first time a customer
-- books or messages a business. This is what the business "owns".
create table public.business_customers (
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, customer_id)
);

-- ---------------------------------------------------------------------------
-- Appointments. status: confirmed | cancelled | completed | no_show
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  service_id uuid not null references public.services (id),
  staff_id uuid references public.staff (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  notes text,
  manage_token uuid not null default gen_random_uuid(), -- secure reschedule/cancel link
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- DOUBLE-BOOKING IS IMPOSSIBLE at the database level:
-- two confirmed appointments for the same staff member can never overlap,
-- and two confirmed appointments with no staff chosen can never overlap
-- inside the same business either.
alter table public.appointments
  add constraint no_overlapping_staff_appointments
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed' and staff_id is not null);

alter table public.appointments
  add constraint no_overlapping_business_appointments
  exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed' and staff_id is null);

create index appointments_business_starts_idx
  on public.appointments (business_id, starts_at);
create index appointments_customer_starts_idx
  on public.appointments (customer_id, starts_at);

-- ---------------------------------------------------------------------------
-- Messages: one thread per (business, customer). sender: customer | business
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  sender text not null check (sender in ('customer', 'business')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_thread_idx
  on public.messages (business_id, customer_id, created_at);

-- ---------------------------------------------------------------------------
-- Reminders: one row per (appointment, kind, channel).
-- kind: confirmation | before_24h | before_2h
-- channel: email | sms
-- status: pending | sent | skipped | cancelled | failed
-- "skipped" = the channel is not configured (e.g. no Twilio yet) — the row
-- records honestly that nothing was delivered.
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  kind text not null check (kind in ('confirmation', 'before_24h', 'before_2h')),
  channel text not null check (channel in ('email', 'sms')),
  scheduled_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'cancelled', 'failed')),
  sent_at timestamptz,
  detail text,
  created_at timestamptz not null default now(),
  unique (appointment_id, kind, channel)
);

create index reminders_due_idx
  on public.reminders (scheduled_at) where (status = 'pending');

-- ===========================================================================
-- ROW LEVEL SECURITY — tenant isolation
-- ===========================================================================
alter table public.customers enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.staff_services enable row level security;
alter table public.availability enable row level security;
alter table public.business_customers enable row level security;
alter table public.appointments enable row level security;
alter table public.messages enable row level security;
alter table public.reminders enable row level security;

-- Helper: does the current user own this business?
create or replace function public.owns_business(b uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses where id = b and owner_id = auth.uid()
  );
$$;

-- customers: see and edit only yourself.
create policy customers_self_read on public.customers
  for select using (id = auth.uid());
create policy customers_self_insert on public.customers
  for insert with check (id = auth.uid());
create policy customers_self_update on public.customers
  for update using (id = auth.uid());
-- a business owner can read the profile of customers who booked with them
create policy customers_owner_read on public.customers
  for select using (
    exists (
      select 1 from public.business_customers bc
      where bc.customer_id = customers.id and public.owns_business(bc.business_id)
    )
  );

-- businesses: public can read published pages; owners manage their own.
create policy businesses_public_read on public.businesses
  for select using (published = true or owner_id = auth.uid());
create policy businesses_owner_insert on public.businesses
  for insert with check (owner_id = auth.uid());
create policy businesses_owner_update on public.businesses
  for update using (owner_id = auth.uid());
create policy businesses_owner_delete on public.businesses
  for delete using (owner_id = auth.uid());

-- services / staff / availability: public read for published businesses,
-- owner writes for their own business.
create policy services_public_read on public.services
  for select using (
    exists (select 1 from public.businesses b
            where b.id = services.business_id and b.published = true)
    or public.owns_business(business_id)
  );
create policy services_owner_write on public.services
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy staff_public_read on public.staff
  for select using (
    exists (select 1 from public.businesses b
            where b.id = staff.business_id and b.published = true)
    or public.owns_business(business_id)
  );
create policy staff_owner_write on public.staff
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

create policy staff_services_public_read on public.staff_services
  for select using (
    exists (select 1 from public.staff s
            where s.id = staff_services.staff_id
              and (public.owns_business(s.business_id)
                   or exists (select 1 from public.businesses b
                              where b.id = s.business_id and b.published = true)))
  );
create policy staff_services_owner_write on public.staff_services
  for all using (
    exists (select 1 from public.staff s
            where s.id = staff_services.staff_id and public.owns_business(s.business_id))
  )
  with check (
    exists (select 1 from public.staff s
            where s.id = staff_services.staff_id and public.owns_business(s.business_id))
  );

create policy availability_public_read on public.availability
  for select using (
    exists (select 1 from public.businesses b
            where b.id = availability.business_id and b.published = true)
    or public.owns_business(business_id)
  );
create policy availability_owner_write on public.availability
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

-- business_customers: the customer sees their own relationships;
-- the business sees only its own.
create policy business_customers_read on public.business_customers
  for select using (customer_id = auth.uid() or public.owns_business(business_id));
create policy business_customers_insert on public.business_customers
  for insert with check (customer_id = auth.uid() or public.owns_business(business_id));

-- appointments: a customer sees only their own; a business sees only its own.
create policy appointments_customer_read on public.appointments
  for select using (customer_id = auth.uid());
create policy appointments_owner_read on public.appointments
  for select using (public.owns_business(business_id));
create policy appointments_customer_insert on public.appointments
  for insert with check (customer_id = auth.uid());
create policy appointments_owner_insert on public.appointments
  for insert with check (public.owns_business(business_id));
create policy appointments_customer_update on public.appointments
  for update using (customer_id = auth.uid());
create policy appointments_owner_update on public.appointments
  for update using (public.owns_business(business_id));

-- messages: thread visible to exactly the customer and the owning business.
create policy messages_read on public.messages
  for select using (customer_id = auth.uid() or public.owns_business(business_id));
create policy messages_customer_insert on public.messages
  for insert with check (customer_id = auth.uid() and sender = 'customer');
create policy messages_owner_insert on public.messages
  for insert with check (public.owns_business(business_id) and sender = 'business');
create policy messages_owner_mark_read on public.messages
  for update using (public.owns_business(business_id));
create policy messages_customer_mark_read on public.messages
  for update using (customer_id = auth.uid());

-- reminders: no direct client access. The reminder engine uses the
-- service role (which bypasses RLS) from the server only.

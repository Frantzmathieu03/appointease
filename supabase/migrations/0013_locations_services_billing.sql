-- AppointEase migration 0013 — locations, service upgrades.
-- Run after 0001–0012.
--
-- Source: "Dashboard Changes & Customer History" PDF (2026-11-25),
-- §3/§4/§11 step 9 (Locations, Reports, Billing page, booking page
-- editor, service settings) — adapted to Frantz's standing rules:
--   * AppointEase NEVER receives or holds client money — nothing in
--     this migration touches payments, deposits or fees. Reports and
--     the Billing page count appointments and the owner's own plan
--     only; there is no revenue figure anywhere to add.
--   * Simplicity: locations are optional. A business with no location
--     rows behaves exactly as today — its main address (businesses.
--     address) is the address customers see. Nothing is backfilled.
--
-- NOTE on "who offers this service": the join table already exists —
-- public.staff_services (migration 0001, staff_id + service_id, owner
-- write RLS, "empty for a service = everyone offers it"). This
-- migration does NOT create a second, parallel table; it only adds
-- the member-read policy the 0011 pattern calls for. The new pieces
-- here are: locations, appointments.location_id, services.visit_type.

-- ---------------------------------------------------------------------------
-- locations: a business's branches. Optional — zero rows is normal.
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create index locations_business_idx on public.locations (business_id, created_at);

-- An appointment can say which location it happens at (nullable: most
-- appointments at single-location businesses never set it).
alter table public.appointments
  add column if not exists location_id uuid
    references public.locations (id) on delete set null;

create index appointments_location_idx
  on public.appointments (location_id) where location_id is not null;

-- ---------------------------------------------------------------------------
-- services.visit_type: where the service happens.
-- 'in_person' (at the business) | 'online' | 'both' (customer's choice).
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists visit_type text not null default 'in_person'
    check (visit_type in ('in_person', 'online', 'both'));

alter table public.locations enable row level security;

-- ---------------------------------------------------------------------------
-- RLS — locations: the owner manages them; any member of the business
-- can read them (0011 pattern). Customers never read this table — the
-- public page keeps showing the business's main address.
-- ---------------------------------------------------------------------------
create policy locations_owner_all on public.locations
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
create policy locations_member_read on public.locations
  for select using (public.business_role(business_id) is not null);

-- staff_services member read (0011 pattern): team logins can see who
-- offers what for their business. Writes stay owner-only (0001).
create policy staff_services_member_read on public.staff_services
  for select using (
    exists (
      select 1 from public.staff s
      where s.id = staff_services.staff_id
        and public.business_role(s.business_id) is not null
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (same pattern as 0003/0010/0011): RLS above is the isolation
-- layer; these only open the door the policies then guard.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.locations
  to anon, authenticated, service_role;

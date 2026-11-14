-- AppointEase — row-level security policies
--
-- Posture: the Express backend connects through DATABASE_URL as the table
-- owner (the Postgres role), which bypasses RLS; the backend enforces access
-- in its auth middleware exactly as it did on MongoDB. These policies are the
-- defense-in-depth layer for any direct Supabase client access and take full
-- effect when Supabase Auth lands (phase 2): auth.uid() is then the row id of
-- the signed-in user/business, because users.id / businesses.id are the
-- identity keys. Until then, anon/authenticated roles get nothing beyond
-- what the policies below grant — public directory data keeps flowing through
-- the backend API, never through direct table reads.

alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews enable row level security;
alter table public.notification_log enable row level security;

-- users: a client sees and edits only their own profile.
create policy "users: read own profile"
  on public.users for select
  using (id = auth.uid());

create policy "users: update own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- businesses: a business sees and edits only its own record. (Public
-- directory fields are served by the backend API, not by table reads.)
create policy "businesses: read own record"
  on public.businesses for select
  using (id = auth.uid());

create policy "businesses: update own record"
  on public.businesses for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- appointments: the booking client and the booked business each see the
-- appointment; a client creates bookings only as themselves; either party
-- can update (cancel/reschedule flows go through the backend).
create policy "appointments: client reads own bookings"
  on public.appointments for select
  using (client_id = auth.uid());

create policy "appointments: business reads own bookings"
  on public.appointments for select
  using (business_id = auth.uid());

create policy "appointments: client creates own booking"
  on public.appointments for insert
  with check (client_id = auth.uid());

create policy "appointments: parties update"
  on public.appointments for update
  using (client_id = auth.uid() or business_id = auth.uid())
  with check (client_id = auth.uid() or business_id = auth.uid());

-- reviews: publicly readable (they power ratings); a client writes only
-- reviews attached to their own identity.
create policy "reviews: public read"
  on public.reviews for select
  using (true);

create policy "reviews: client creates own review"
  on public.reviews for insert
  with check (client_id = auth.uid());

-- notification_log: a business reads only its own send history.
create policy "notification_log: business reads own log"
  on public.notification_log for select
  using (business_id = auth.uid());

-- AppointEase demo seed — Main Street Barbers
-- Run AFTER 0001_schema.sql (Supabase: `supabase db reset` applies seed.sql,
-- or paste into the SQL editor of the real project).
--
-- Creates a demo owner login (owner@mainstreetbarber.example / demo-password —
-- LOCAL DEMO ONLY, delete before real use), the business, its services,
-- one staff member, and Mon–Sat 9:00–18:00 hours, already published so the
-- page at /main-street-barbers and the booking flow work immediately.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'owner@mainstreetbarber.example',
  crypt('demo-password', gen_salt('bf')),
  now(), '{"full_name":"Main Street Barbers (demo owner)"}'::jsonb, now(), now()
) on conflict (id) do nothing;

insert into public.businesses (id, owner_id, slug, name, type, category, address, phone, email, published)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'main-street-barbers', 'Main Street Barbers', 'Barbershop', 'barbershops',
  '25 Main St, Boston, MA', '617-555-0142', 'owner@mainstreetbarber.example', true
) on conflict (slug) do nothing;

insert into public.services (business_id, name, duration_minutes, price_cents) values
  ('22222222-2222-2222-2222-222222222222', 'Classic haircut', 30, 3500),
  ('22222222-2222-2222-2222-222222222222', 'Haircut & beard trim', 45, 4500),
  ('22222222-2222-2222-2222-222222222222', 'Beard trim', 20, 2000)
on conflict do nothing;

insert into public.staff (id, business_id, name) values
  ('33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222222', 'Marcus')
on conflict (id) do nothing;

-- Mon–Sat (weekday 1..6), 9:00 AM – 6:00 PM, business-wide hours.
insert into public.availability (business_id, staff_id, weekday, open_time, close_time)
select '22222222-2222-2222-2222-222222222222', null, d, '09:00', '18:00'
from generate_series(1, 6) as d
on conflict do nothing;

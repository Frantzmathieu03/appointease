-- AppointEase migration 0018: "new booking" tracking for the owner
-- dashboard's Appointments section.
--
-- owner_seen_at is stamped the first time anyone on the business's
-- team opens the appointment's detail page. The side menu badge and
-- the NEW tags on the Appointments list count appointments where
-- owner_seen_at is null and the booking is not cancelled.
--
-- All app code feature-detects this column: before this migration
-- lands there is simply no badge and no tags, and every page works
-- exactly as before. No RLS changes are needed: the existing
-- appointments policies already cover reading the row, and the
-- stamp is written server-side after membership is proven.

alter table public.appointments
  add column if not exists owner_seen_at timestamptz;

comment on column public.appointments.owner_seen_at is
  'When a team member first opened this appointment in the dashboard (migration 0018). Null means the booking is still new.';

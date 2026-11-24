-- AppointEase migration 0003 — table privileges for the API roles.
-- Run after 0001 + 0002.
--
-- Tables created through raw SQL do not receive Supabase's automatic grants,
-- so the anon / authenticated / service_role roles could not read anything
-- through the API even though RLS policies exist ("permission denied for
-- table businesses", SQLSTATE 42501). RLS remains the isolation layer —
-- these grants only open the door the policies then guard. Tables with no
-- client policies (reminders, notifications_log) stay unreachable to
-- anon/authenticated regardless.

grant select, insert, update, delete
  on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select
  on all sequences in schema public
  to anon, authenticated, service_role;

grant execute
  on all functions in schema public
  to anon, authenticated, service_role;

-- AppointEase migration 0022: account deletion grace period.
--
-- Until now, deleting an account in the app deleted it on the spot.
-- Frantz (2026-11-27) ordered a 48 hour grace period instead: asking
-- to delete schedules the deletion 48 hours out, the account keeps
-- working normally in the meantime, and the person can undo the
-- request at any point before the 48 hours are up.
--
--   * public.account_deletion_requests: one row per deletion ask.
--     status moves pending -> cancelled (the person undid it) or
--     pending -> done (the processor carried the deletion out).
--     due_at is requested_at + 48 hours; the processor only touches
--     pending rows whose due_at has passed. A partial unique index
--     keeps at most one pending request per user.
--
-- The deletion itself is unchanged: the cron processor at
-- /api/cron/deletions runs the exact steps the delete route used to
-- run immediately (cancel owned businesses' Stripe subscriptions
-- first and stop if Stripe refuses, cancel the person's future
-- appointments, delete their messages and form submissions, then
-- delete the auth user). When the auth user goes, this table's row
-- for them goes too (on delete cascade), so no personal data is
-- kept after a completed deletion.
--
-- RLS: a signed-in user can read, create and update ONLY their own
-- rows (auth.uid() = user_id), same pattern as migration 0017. The
-- API routes and the processor use the service role and bypass RLS
-- as usual.
--
-- Safe to run before or after the app deploy: every read and write
-- of this table in the app is feature-detected and no-ops quietly
-- until this lands (same pattern as migrations 0010 to 0017). Until
-- it lands, the delete route answers that deletion is being set up
-- and deletes nothing.

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  requested_at timestamptz not null default now(),
  due_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'cancelled', 'done')),
  processed_at timestamptz
);

create index account_deletion_requests_due_idx
  on public.account_deletion_requests (status, due_at);

create unique index account_deletion_requests_one_pending_idx
  on public.account_deletion_requests (user_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Row level security: self only.
-- ---------------------------------------------------------------------------
alter table public.account_deletion_requests enable row level security;

create policy account_deletion_requests_select_own
  on public.account_deletion_requests
  for select to authenticated
  using (auth.uid() = user_id);

create policy account_deletion_requests_insert_own
  on public.account_deletion_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy account_deletion_requests_update_own
  on public.account_deletion_requests
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy account_deletion_requests_delete_own
  on public.account_deletion_requests
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants (same pattern as 0003/0010/0011/0017): RLS above is the
-- isolation layer; these only open the door the policies then guard.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.account_deletion_requests
  to anon, authenticated, service_role;

comment on table public.account_deletion_requests is
  'Account deletion asks with a 48 hour grace period (migration 0022). Pending rows past due_at are carried out by the /api/cron/deletions processor.';

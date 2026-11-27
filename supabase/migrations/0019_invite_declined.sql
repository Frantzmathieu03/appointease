-- AppointEase migration 0019: team invite declines.
--
-- Until now an invite could only be accepted, revoked (deleted by
-- the owner), or left to expire. The invite landing page now offers
-- Decline as a real answer: declined_at records when the person
-- declined, the Team page shows the invite as Declined, and the
-- seat is never consumed (a decline creates no membership).
--
-- All app code feature-detects this column: before this migration
-- lands, the landing page simply does not offer Decline and every
-- other invite behavior is unchanged.

alter table public.team_invites
  add column if not exists declined_at timestamptz;

comment on column public.team_invites.declined_at is
  'When the invited person declined this invite (migration 0019). Null means they have not declined.';

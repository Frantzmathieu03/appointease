-- AppointEase migration 0015 — team invites: name + owner-only invites
-- (Owner Dashboard Plan, Frantz 2026-11-26).
--
-- Two changes, both in the team lane from migration 0011:
--
--   * team_invites.name — the invite card asks for the person's name
--     (it becomes their staff calendar's name for staff invites, and
--     is how the roster refers to them before they accept). Nullable:
--     older invites simply have no name.
--
--   * Invite creation becomes the OWNER's alone. The dashboard plan
--     is explicit: managers see the whole business EXCEPT Billing and
--     Team management. Migration 0011 let managers create invites and
--     member rows directly; the app already gates the invite route
--     and the Team page to the owner, and this tightens RLS to match
--     so no client can bypass the UI. Nothing else changes:
--       - the invite-accept route writes business_members with the
--         service role and never relied on these policies;
--       - removal/revoke were already owner-only and stay so;
--       - managers keep READING the roster and invites (0011).
--
-- Safe to run before or after the Phase 2 app deploy: the app
-- feature-detects the name column and owner-gates invites itself.
--
--   * MARKED PAID (revised Dashboard Changes PDF, 2026-11-26): the
--     front desk may mark an appointment paid AT THE OFFICE — offline
--     bookkeeping only; no money ever moves through AppointEase. The
--     mark is a customer timeline event of type 'marked_paid', which
--     the 0010 check constraint does not allow yet, so widen it here.
--     The app is safe before this lands: the mark-paid route reports
--     a plain "turns on with the next update" note until it does.

alter table public.customer_events
  drop constraint if exists customer_events_type_check;
alter table public.customer_events
  add constraint customer_events_type_check check (type in (
    'registered', 'booked', 'rescheduled', 'cancelled', 'no_show',
    'completed', 'form_submitted', 'reminder_sent', 'message',
    'assigned', 'note_added', 'profile_changed', 'marked_paid'
  ));

alter table public.team_invites
  add column if not exists name text;

drop policy if exists team_invites_insert on public.team_invites;
create policy team_invites_insert on public.team_invites
  for insert with check (public.business_role(business_id) = 'owner');

drop policy if exists business_members_insert on public.business_members;
create policy business_members_insert on public.business_members
  for insert with check (public.business_role(business_id) = 'owner');

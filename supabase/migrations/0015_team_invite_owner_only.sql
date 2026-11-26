-- AppointEase migration 0015 — Phase 2 follow-ups: team invite name +
-- owner-only invites, the 'marked_paid' timeline type, and the
-- 14-day trial default (Owner Dashboard Plan + revised PDFs,
-- Frantz 2026-11-26).
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

-- 5. TRIAL LENGTH (Frantz, 2026-11-26): the free trial is 14 days,
--    not 30. Changing the column DEFAULT only affects businesses
--    created after this runs — existing rows keep the trial_ends_at
--    they already have. The app also sets trial_ends_at explicitly
--    at creation (CreateBusinessForm, TRIAL_DAYS in lib/plans.ts), so
--    new signups get 14 days whether or not this has landed yet.
alter table public.businesses
  alter column trial_ends_at set default (now() + interval '14 days');

alter table public.team_invites
  add column if not exists name text;

drop policy if exists team_invites_insert on public.team_invites;
create policy team_invites_insert on public.team_invites
  for insert with check (public.business_role(business_id) = 'owner');

drop policy if exists business_members_insert on public.business_members;
create policy business_members_insert on public.business_members
  for insert with check (public.business_role(business_id) = 'owner');

-- 6. SEAT LIMIT (Frantz, 2026-11-26): plans count people with a
--    calendar — Solo 1 · Team 5 · Business 15, owner included (the
--    active staff rows). The app stops an over-cap add first with
--    the friendly upgrade prompt (invite route + StaffManager); this
--    trigger is the database backstop so no insert path can pass the
--    cap. The caps mirror src/lib/plans.ts — change both together.
--    Existing rows are untouched: a business already over its cap
--    keeps its calendars; only NEW adds stop.
create or replace function public.enforce_staff_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int;
  used int;
begin
  select case plan when 'team' then 5 when 'business' then 15 else 1 end
    into lim
    from public.businesses
    where id = NEW.business_id;
  if lim is null then
    return NEW;
  end if;
  select count(*) into used
    from public.staff
    where business_id = NEW.business_id and active;
  if used >= lim then
    raise exception 'seat limit reached for this plan';
  end if;
  return NEW;
end;
$$;

drop trigger if exists staff_seat_limit on public.staff;
create trigger staff_seat_limit
  before insert on public.staff
  for each row execute function public.enforce_staff_seat_limit();

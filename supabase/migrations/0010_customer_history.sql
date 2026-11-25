-- AppointEase migration 0010 — customer history, assignment, visit notes.
-- Run after 0001–0009.
--
-- Source: "Dashboard Changes & Customer History" PDF (2026-11-25), §§6–10,
-- adapted to Frantz's standing rules:
--   * AppointEase NEVER receives or holds client money — so there are NO
--     paid / refunded event types and no payments tab. Money a business
--     collects directly, outside AppointEase, is not recorded here.
--   * The cancellation-reason column already exists as
--     appointments.cancellation_reason (migration 0002) — it is NOT
--     duplicated here.
--   * Appointment statuses completed / no_show already exist in the 0001
--     status check — no constraint change needed.
--   * Client assignment is per-business (each business assigns its own
--     customers to its own staff), so assigned_staff_id lives on
--     business_customers — the per-business relationship row — not on the
--     global customers table.

-- ---------------------------------------------------------------------------
-- Assignment: which staff member a customer is assigned to at this business.
-- ---------------------------------------------------------------------------
alter table public.business_customers
  add column if not exists assigned_staff_id uuid
    references public.staff (id) on delete set null;

create index if not exists business_customers_assigned_idx
  on public.business_customers (business_id, assigned_staff_id);

-- The owner needs to UPDATE the relationship row (assignment) — 0001 only
-- granted select/insert on business_customers.
create policy business_customers_owner_update on public.business_customers
  for update using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- Appointments: who cancelled, and when a visit was completed.
-- ---------------------------------------------------------------------------
alter table public.appointments
  add column if not exists cancelled_by text
    check (cancelled_by in ('customer', 'team_member', 'system')),
  add column if not exists completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- customer_events: the append-only timeline. One row per thing that
-- happened to a customer at a business, with who did it. Rows are never
-- updated or deleted — there are deliberately no update/delete policies.
-- Payment event types (paid / refunded) are intentionally absent: money
-- never flows through AppointEase.
-- ---------------------------------------------------------------------------
create table public.customer_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  type text not null check (type in (
    'registered', 'booked', 'rescheduled', 'cancelled', 'no_show',
    'completed', 'form_submitted', 'reminder_sent', 'message',
    'assigned', 'note_added', 'profile_changed'
  )),
  actor_type text not null check (actor_type in ('customer', 'team_member', 'system')),
  actor_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index customer_events_timeline_idx
  on public.customer_events (business_id, customer_id, created_at desc);

alter table public.customer_events enable row level security;

-- The owning business reads its own customers' timelines.
create policy customer_events_owner_read on public.customer_events
  for select using (public.owns_business(business_id));
-- Owner-side writes from the dashboard (assignment changes, note events).
-- Customer-side events (booked / cancelled / messages) are written by
-- server routes with the service role, which bypasses RLS.
create policy customer_events_owner_insert on public.customer_events
  for insert with check (public.owns_business(business_id));
-- No update / delete policies: the timeline is append-only.

-- ---------------------------------------------------------------------------
-- visit_notes: what was discussed and what the customer did, written by a
-- team member after a visit. Internal by default; a note can share a short
-- summary with the customer (shared_summary) — internal text is never
-- exposed to the customer by policy.
-- ---------------------------------------------------------------------------
create table public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  outcome text not null check (outcome in ('completed', 'no_show', 'cancelled_late', 'rescheduled')),
  discussed text not null default '',
  customer_actions text not null default '',
  visibility text not null default 'internal' check (visibility in ('internal', 'shared')),
  shared_summary text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visit_notes_customer_idx
  on public.visit_notes (business_id, customer_id, created_at desc);
create index visit_notes_appointment_idx
  on public.visit_notes (appointment_id);

alter table public.visit_notes enable row level security;

create policy visit_notes_owner_all on public.visit_notes
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
-- A customer can read ONLY notes explicitly shared with them, and only
-- their own. (The app renders shared_summary for customers, never the
-- internal discussed / customer_actions text.)
create policy visit_notes_customer_read_shared on public.visit_notes
  for select using (customer_id = auth.uid() and visibility = 'shared');

-- ---------------------------------------------------------------------------
-- visit_note_addenda: after a note's 24-hour edit window, changes are
-- appended here with author + time instead of rewriting the note.
-- ---------------------------------------------------------------------------
create table public.visit_note_addenda (
  id uuid primary key default gen_random_uuid(),
  visit_note_id uuid not null references public.visit_notes (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index visit_note_addenda_note_idx
  on public.visit_note_addenda (visit_note_id, created_at);

alter table public.visit_note_addenda enable row level security;

create policy visit_note_addenda_owner_all on public.visit_note_addenda
  for all using (
    exists (
      select 1 from public.visit_notes n
      where n.id = visit_note_addenda.visit_note_id
        and public.owns_business(n.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.visit_notes n
      where n.id = visit_note_addenda.visit_note_id
        and public.owns_business(n.business_id)
    )
  );

-- ---------------------------------------------------------------------------
-- next_steps: checklist items attached to a visit note. owner = who the
-- step belongs to ('client' steps are the customer's to-dos, shown with a
-- shared summary; 'team' steps are internal). done_by records who ticked
-- the item off.
-- ---------------------------------------------------------------------------
create table public.next_steps (
  id uuid primary key default gen_random_uuid(),
  visit_note_id uuid not null references public.visit_notes (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  text text not null,
  owner text not null default 'team' check (owner in ('client', 'team')),
  due_date date,
  done_at timestamptz,
  done_by uuid,
  created_at timestamptz not null default now()
);

create index next_steps_note_idx on public.next_steps (visit_note_id);
create index next_steps_customer_idx
  on public.next_steps (business_id, customer_id, done_at);

alter table public.next_steps enable row level security;

create policy next_steps_owner_all on public.next_steps
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
-- A customer sees the steps on their own record (the app shows only
-- 'client' steps alongside a shared summary).
create policy next_steps_customer_read on public.next_steps
  for select using (customer_id = auth.uid());
create policy next_steps_customer_update on public.next_steps
  for update using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (same pattern as 0003/0005): RLS above is the isolation layer;
-- these only open the door the policies then guard.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.customer_events, public.visit_notes, public.visit_note_addenda,
     public.next_steps
  to anon, authenticated, service_role;

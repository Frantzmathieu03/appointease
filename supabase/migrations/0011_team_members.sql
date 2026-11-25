-- AppointEase migration 0011 — team logins: members, roles, invites.
-- Run after 0001–0010.
--
-- Source: "Dashboard Changes & Customer History" PDF (2026-11-25),
-- §§2–4, §9 — adapted to Frantz's standing rules:
--   * AppointEase NEVER receives or holds client money — nothing in this
--     migration touches payments, deposits or fees.
--   * The business owner is IMPLICITLY a member with role 'owner'
--     (businesses.owner_id). No business_members row is required for the
--     owner, and every existing owns_business() policy keeps working
--     exactly as before. Member access below is purely ADDITIVE.
--   * A staff member sees ONLY the customers assigned to their staff
--     record (business_customers.assigned_staff_id, migration 0010) —
--     those customers' appointments, timeline events, visit notes, next
--     steps and message threads. Managers see the whole business but
--     cannot remove team members or manage billing (removal is
--     owner-only in policy; billing stays owner-only as before).

-- ---------------------------------------------------------------------------
-- business_members: one login's membership of one business.
-- role: owner | manager | staff. staff_id links a staff login to the
-- bookable staff row their assigned customers hang off (migration 0010).
-- email is stored for display (the invite address) — auth.users emails
-- are not readable from the client.
-- ---------------------------------------------------------------------------
create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  role text not null check (role in ('owner', 'manager', 'staff')),
  staff_id uuid references public.staff (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index business_members_user_idx
  on public.business_members (user_id, status);
create index business_members_business_idx
  on public.business_members (business_id, status);

-- ---------------------------------------------------------------------------
-- team_invites: an emailed invitation. The token is the credential for
-- the /invite/<token> accept page; acceptance is performed by a server
-- route with the service role after verifying the signed-in user's
-- email matches the invite address, so no client insert policy on
-- business_members is needed for the accept flow.
-- ---------------------------------------------------------------------------
create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  role text not null check (role in ('manager', 'staff')),
  staff_id uuid references public.staff (id) on delete set null,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index team_invites_business_idx
  on public.team_invites (business_id, created_at desc);

alter table public.business_members enable row level security;
alter table public.team_invites enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers (security definer, same pattern as owns_business in 0001).
-- ---------------------------------------------------------------------------

-- The current user's role at a business: 'owner' (implicit, from
-- businesses.owner_id), their business_members role, or null.
create or replace function public.business_role(b uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when exists (
      select 1 from public.businesses where id = b and owner_id = auth.uid()
    ) then 'owner'
    else (
      select m.role from public.business_members m
      where m.business_id = b and m.user_id = auth.uid() and m.status = 'active'
      limit 1
    )
  end;
$$;

-- The staff row the current user's membership is linked to (null for
-- owners / managers without a staff link / non-members).
create or replace function public.member_staff_id(b uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select m.staff_id from public.business_members m
  where m.business_id = b and m.user_id = auth.uid() and m.status = 'active'
  limit 1;
$$;

-- May the current user see this customer at this business? Owners and
-- managers: every customer of the business. Staff: only customers
-- assigned to their staff record.
create or replace function public.member_can_see_customer(b uuid, c uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select case
    when public.business_role(b) in ('owner', 'manager') then exists (
      select 1 from public.business_customers bc
      where bc.business_id = b and bc.customer_id = c
    )
    when public.business_role(b) = 'staff' then exists (
      select 1 from public.business_customers bc
      where bc.business_id = b and bc.customer_id = c
        and bc.assigned_staff_id = public.member_staff_id(b)
    )
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Membership tables' own policies.
-- ---------------------------------------------------------------------------

-- Members list: you can always see your own membership row; owners and
-- managers see the business's whole roster.
create policy business_members_read on public.business_members
  for select using (
    user_id = auth.uid()
    or public.business_role(business_id) in ('owner', 'manager')
  );
-- Direct inserts are owner/manager only (the invite-accept route uses
-- the service role and does not depend on this policy).
create policy business_members_insert on public.business_members
  for insert with check (public.business_role(business_id) in ('owner', 'manager'));
-- Changes and removal are the OWNER's alone (managers cannot remove
-- team members — PDF §9).
create policy business_members_owner_update on public.business_members
  for update using (public.business_role(business_id) = 'owner')
  with check (public.business_role(business_id) = 'owner');
create policy business_members_owner_delete on public.business_members
  for delete using (public.business_role(business_id) = 'owner');

-- Invites: owners and managers can create and view them; only the
-- owner can revoke (delete) one.
create policy team_invites_read on public.team_invites
  for select using (public.business_role(business_id) in ('owner', 'manager'));
create policy team_invites_insert on public.team_invites
  for insert with check (public.business_role(business_id) in ('owner', 'manager'));
create policy team_invites_owner_delete on public.team_invites
  for delete using (public.business_role(business_id) = 'owner');

-- ---------------------------------------------------------------------------
-- Additive member access on the existing tables. Every policy below is
-- a NEW permissive policy: existing owner/customer policies are
-- untouched, so nothing that works today can break.
-- ---------------------------------------------------------------------------

-- A member can read their business row even before it is published
-- (owners already can; staff logins land on an unpublished business
-- during setup otherwise).
create policy businesses_member_read on public.businesses
  for select using (public.business_role(id) is not null);

-- Staff/manager rosters, services and hours: readable by any member.
create policy staff_member_read on public.staff
  for select using (public.business_role(business_id) is not null);
create policy services_member_read on public.services
  for select using (public.business_role(business_id) is not null);
create policy availability_member_read on public.availability
  for select using (public.business_role(business_id) is not null);

-- Customer relationships + profiles: scoped by member_can_see_customer.
create policy business_customers_member_read on public.business_customers
  for select using (public.member_can_see_customer(business_id, customer_id));
create policy business_customers_member_update on public.business_customers
  for update using (public.member_can_see_customer(business_id, customer_id))
  with check (
    public.business_role(business_id) in ('owner', 'manager')
    or public.member_can_see_customer(business_id, customer_id)
  );
create policy customers_member_read on public.customers
  for select using (
    exists (
      select 1 from public.business_customers bc
      where bc.customer_id = customers.id
        and public.member_can_see_customer(bc.business_id, bc.customer_id)
    )
  );

-- Appointments, timeline, notes, steps, messages: the same scope.
create policy appointments_member_read on public.appointments
  for select using (public.member_can_see_customer(business_id, customer_id));
create policy customer_events_member_read on public.customer_events
  for select using (public.member_can_see_customer(business_id, customer_id));
create policy customer_events_member_insert on public.customer_events
  for insert with check (public.member_can_see_customer(business_id, customer_id));
create policy visit_notes_member_read on public.visit_notes
  for select using (public.member_can_see_customer(business_id, customer_id));
create policy visit_notes_member_insert on public.visit_notes
  for insert with check (
    public.member_can_see_customer(business_id, customer_id)
    and author_id = auth.uid()
  );
create policy visit_notes_member_update on public.visit_notes
  for update using (
    public.member_can_see_customer(business_id, customer_id)
    and (author_id = auth.uid() or public.business_role(business_id) in ('owner', 'manager'))
  )
  with check (public.member_can_see_customer(business_id, customer_id));
create policy visit_note_addenda_member_insert on public.visit_note_addenda
  for insert with check (
    exists (
      select 1 from public.visit_notes n
      where n.id = visit_note_addenda.visit_note_id
        and public.member_can_see_customer(n.business_id, n.customer_id)
    )
  );
create policy visit_note_addenda_member_read on public.visit_note_addenda
  for select using (
    exists (
      select 1 from public.visit_notes n
      where n.id = visit_note_addenda.visit_note_id
        and public.member_can_see_customer(n.business_id, n.customer_id)
    )
  );
create policy next_steps_member_read on public.next_steps
  for select using (public.member_can_see_customer(business_id, customer_id));
create policy next_steps_member_update on public.next_steps
  for update using (public.member_can_see_customer(business_id, customer_id))
  with check (public.member_can_see_customer(business_id, customer_id));
create policy messages_member_read on public.messages
  for select using (public.member_can_see_customer(business_id, customer_id));
create policy messages_member_insert on public.messages
  for insert with check (
    sender = 'business' and public.member_can_see_customer(business_id, customer_id)
  );
create policy messages_member_mark_read on public.messages
  for update using (public.member_can_see_customer(business_id, customer_id));

-- Reminder state for a member's own customers' appointments (the
-- appointment detail page reads public.reminders).
create policy reminders_member_read on public.reminders
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = reminders.appointment_id
        and public.member_can_see_customer(a.business_id, a.customer_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Grants (same pattern as 0003/0010): RLS above is the isolation layer.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.business_members, public.team_invites
  to anon, authenticated, service_role;

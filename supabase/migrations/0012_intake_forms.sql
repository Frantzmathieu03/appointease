-- AppointEase migration 0012 — intake forms, form submissions, note
-- templates. Run after 0001–0011.
--
-- Source: "Dashboard Changes & Customer History" PDF (2026-11-25),
-- §4 (Forms list/builder/preview; Services "which form attaches"),
-- §6 (form_submitted timeline event — the type already exists in the
-- 0010 check constraint), §7 (note templates per service), §8 (customer
-- profile "Forms & files" tab).
--
-- Adapted to Frantz's standing rules:
--   * AppointEase NEVER receives or holds client money — there are NO
--     fee / deposit fields on forms or services, and none are added here.
--   * Customer access to a form runs through the appointment's manage
--     token (the existing credential): the /api/manage/<token>/form
--     route reads and writes with the service role after verifying the
--     token, so customers need no direct write policy on these tables.
--     The customer policies below exist for signed-in customers reading
--     their OWN submissions (My Appointments) — nothing more.
--   * Member read access follows the 0011 pattern
--     (member_can_see_customer): a staff login sees submissions only
--     for customers assigned to them; owners/managers see the business.
--   * Uploaded documents live in a NEW PRIVATE bucket "form-uploads"
--     (business-media is public-read; intake documents are not). Paths
--     are <business_id>/<customer_id>/<file>. Every storage policy
--     extracts storage.foldername(name) at the policy's TOP LEVEL —
--     the 0006/0008 trap (foldername evaluated inside a subquery on
--     another table, where "name" binds to that table's column) is
--     deliberately avoided: folder segments are computed first and only
--     the resulting uuids are passed to the helper functions.

-- ---------------------------------------------------------------------------
-- forms: one intake form owned by a business.
-- ---------------------------------------------------------------------------
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index forms_business_idx on public.forms (business_id, created_at);

-- ---------------------------------------------------------------------------
-- form_questions: the builder's rows. type is one of the six PDF types.
-- options is a JSON array of strings, used only by multiple_choice.
-- ---------------------------------------------------------------------------
create table public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  label text not null,
  type text not null check (type in (
    'short_text', 'long_text', 'multiple_choice', 'yes_no', 'date', 'file'
  )),
  options jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index form_questions_form_idx
  on public.form_questions (form_id, position, created_at);

-- ---------------------------------------------------------------------------
-- form_submissions: one customer's answers for one form. answers is a
-- JSON object keyed by question id: text answers are strings; a file
-- answer is an array of storage paths inside the form-uploads bucket.
-- ---------------------------------------------------------------------------
create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT, not cascade: a submission is a record of what a customer
  -- was asked and answered. A form that already has submissions cannot
  -- be deleted out from under them.
  form_id uuid not null references public.forms (id) on delete restrict,
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index form_submissions_business_customer_idx
  on public.form_submissions (business_id, customer_id, submitted_at desc);
create index form_submissions_appointment_idx
  on public.form_submissions (appointment_id);

-- ---------------------------------------------------------------------------
-- A service can attach ONE form (PDF §4 Services: "which form
-- attaches"). Nullable; deleting a form detaches it from services.
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists form_id uuid
    references public.forms (id) on delete set null;

-- ---------------------------------------------------------------------------
-- note_templates (PDF §7): per-service starter text for visit notes.
-- Simple honest design: a name plus two prompt texts — the text the
-- "What we discussed" and "What the customer did / decided" fields are
-- pre-filled with when the author picks the template. service_id null
-- = a business-wide template offered for every service.
-- ---------------------------------------------------------------------------
create table public.note_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  name text not null,
  discussed_prompt text not null default '',
  actions_prompt text not null default '',
  created_at timestamptz not null default now()
);

create index note_templates_business_idx
  on public.note_templates (business_id, created_at);

alter table public.forms enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_submissions enable row level security;
alter table public.note_templates enable row level security;

-- ---------------------------------------------------------------------------
-- RLS — forms & questions: the owner manages them; any member of the
-- business can read them (a form's definition is not customer data —
-- the answers are, and those are scoped separately below). Signed-in
-- customers linked to the business can also read its forms/questions
-- (their submissions still go through the manage-token route).
-- ---------------------------------------------------------------------------
create policy forms_owner_all on public.forms
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
create policy forms_member_read on public.forms
  for select using (public.business_role(business_id) is not null);
create policy forms_customer_read on public.forms
  for select using (
    exists (
      select 1 from public.business_customers bc
      where bc.business_id = forms.business_id and bc.customer_id = auth.uid()
    )
  );

create policy form_questions_owner_all on public.form_questions
  for all using (
    exists (
      select 1 from public.forms f
      where f.id = form_questions.form_id and public.owns_business(f.business_id)
    )
  )
  with check (
    exists (
      select 1 from public.forms f
      where f.id = form_questions.form_id and public.owns_business(f.business_id)
    )
  );
create policy form_questions_member_read on public.form_questions
  for select using (
    exists (
      select 1 from public.forms f
      where f.id = form_questions.form_id
        and public.business_role(f.business_id) is not null
    )
  );
create policy form_questions_customer_read on public.form_questions
  for select using (
    exists (
      select 1 from public.forms f
      join public.business_customers bc on bc.business_id = f.business_id
      where f.id = form_questions.form_id and bc.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — submissions: owner reads all of the business's; members read
-- only customers they can see (0011); a customer reads their own and
-- can insert one for themselves at a business they're linked to (the
-- manage-token route writes with the service role regardless).
-- ---------------------------------------------------------------------------
create policy form_submissions_owner_read on public.form_submissions
  for select using (public.owns_business(business_id));
create policy form_submissions_member_read on public.form_submissions
  for select using (public.member_can_see_customer(business_id, customer_id));
create policy form_submissions_customer_read on public.form_submissions
  for select using (customer_id = auth.uid());
create policy form_submissions_customer_insert on public.form_submissions
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.business_customers bc
      where bc.business_id = form_submissions.business_id
        and bc.customer_id = auth.uid()
    )
  );
-- No update / delete policies for anyone: a submission is a record,
-- like the timeline. The owner corrects course with a new submission.

-- ---------------------------------------------------------------------------
-- RLS — note templates: owner manages; members read (they pick
-- templates in the visit-notes editor).
-- ---------------------------------------------------------------------------
create policy note_templates_owner_all on public.note_templates
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));
create policy note_templates_member_read on public.note_templates
  for select using (public.business_role(business_id) is not null);

-- ---------------------------------------------------------------------------
-- Storage: PRIVATE bucket for intake documents.
-- Path convention: <business_id>/<customer_id>/<file name>.
-- foldername is extracted at the TOP LEVEL of every policy (see the
-- header note) — never inside a subquery on another table.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('form-uploads', 'form-uploads', false)
on conflict (id) do nothing;

-- Helper for the storage policy below: is the signed-in customer
-- linked to this business? Takes the business id as an ARGUMENT so the
-- storage policy can pass it the folder segment it extracted at its
-- top level — foldername is never evaluated inside a subquery.
create or replace function public.customer_linked_to(b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.business_customers bc
    where bc.business_id = b and bc.customer_id = auth.uid()
  );
$$;

-- Customers write only into their own folder at a business they're
-- linked to: segment 1 = business, segment 2 = their own user id.
create policy "form-uploads customer insert" on storage.objects
  for insert with check (
    bucket_id = 'form-uploads'
    and ((storage.foldername(name))[2])::uuid = auth.uid()
    and public.customer_linked_to(((storage.foldername(name))[1])::uuid)
  );

-- Customers read only their own folder.
create policy "form-uploads customer read" on storage.objects
  for select using (
    bucket_id = 'form-uploads'
    and ((storage.foldername(name))[2])::uuid = auth.uid()
  );

-- The business owner reads everything under their business folder.
create policy "form-uploads owner read" on storage.objects
  for select using (
    bucket_id = 'form-uploads'
    and public.owns_business(((storage.foldername(name))[1])::uuid)
  );

-- Members read files only for customers they can see (0011 pattern).
create policy "form-uploads member read" on storage.objects
  for select using (
    bucket_id = 'form-uploads'
    and public.member_can_see_customer(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

-- The owner can remove files under their business folder (e.g. a
-- customer uploaded the wrong document and asked for it to be deleted).
create policy "form-uploads owner delete" on storage.objects
  for delete using (
    bucket_id = 'form-uploads'
    and public.owns_business(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Grants (same pattern as 0003/0010): RLS above is the isolation layer;
-- these only open the door the policies then guard.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.forms, public.form_questions, public.form_submissions,
     public.note_templates
  to anon, authenticated, service_role;

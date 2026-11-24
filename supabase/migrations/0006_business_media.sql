-- AppointEase migration 0006 — business media: logo + work photos.
-- Run after 0001–0005.
--
-- Each business can show a logo (businesses.logo_url, added in 0001) and
-- up to 4 photos of their work (business_photos, capped in the app).
-- Files live in the public-read Supabase Storage bucket "business-media"
-- under the path <business_id>/<file>; only the owning business's owner
-- can write there (storage policies below keyed on that first folder).

create table if not exists public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists business_photos_business_idx
  on public.business_photos (business_id, position, created_at);

alter table public.business_photos enable row level security;

-- Public reads photos of published businesses; owners manage their own —
-- the same shape as the services/staff policies in 0001.
drop policy if exists business_photos_public_read on public.business_photos;
create policy business_photos_public_read on public.business_photos
  for select using (
    exists (select 1 from public.businesses b
            where b.id = business_photos.business_id and b.published = true)
    or public.owns_business(business_id)
  );
drop policy if exists business_photos_owner_write on public.business_photos;
create policy business_photos_owner_write on public.business_photos
  for all using (public.owns_business(business_id))
  with check (public.owns_business(business_id));

-- Storage bucket: public read (business pages are public), owner-only
-- write. The first path segment is the business id; the write policies
-- check that business belongs to the caller.
insert into storage.buckets (id, name, public)
values ('business-media', 'business-media', true)
on conflict (id) do nothing;

drop policy if exists "business-media public read" on storage.objects;
create policy "business-media public read" on storage.objects
  for select using (bucket_id = 'business-media');

drop policy if exists "business-media owner insert" on storage.objects;
create policy "business-media owner insert" on storage.objects
  for insert with check (
    bucket_id = 'business-media'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );

drop policy if exists "business-media owner update" on storage.objects;
create policy "business-media owner update" on storage.objects
  for update using (
    bucket_id = 'business-media'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );

drop policy if exists "business-media owner delete" on storage.objects;
create policy "business-media owner delete" on storage.objects
  for delete using (
    bucket_id = 'business-media'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
        and b.owner_id = auth.uid()
    )
  );

-- Grants pattern (same as 0003_grants.sql).
grant select, insert, update, delete
  on public.business_photos
  to anon, authenticated, service_role;

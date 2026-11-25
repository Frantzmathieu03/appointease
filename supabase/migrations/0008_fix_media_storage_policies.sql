-- AppointEase migration 0008 — fix business-media storage write policies.
-- Run after 0001–0007.
--
-- BUG (found 2026-11-25, Frantz hit it live during signup): the 0006
-- storage write policies evaluate storage.foldername(name) INSIDE a
-- subquery on public.businesses, where the unqualified column "name"
-- binds to businesses.name (the shop's display name) instead of the
-- storage object's path. foldername of a shop name has no segments, so
-- the ownership EXISTS check could never be true and EVERY owner logo /
-- photo upload was denied with "new row violates row-level security
-- policy".
--
-- FIX: extract the first path segment at the policy's top level (where
-- "name" is the object path) and check ownership through the existing
-- security-definer helper public.owns_business(uuid) from 0001.

drop policy if exists "business-media owner insert" on storage.objects;
create policy "business-media owner insert" on storage.objects
  for insert with check (
    bucket_id = 'business-media'
    and public.owns_business(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "business-media owner update" on storage.objects;
create policy "business-media owner update" on storage.objects
  for update using (
    bucket_id = 'business-media'
    and public.owns_business(((storage.foldername(name))[1])::uuid)
  ) with check (
    bucket_id = 'business-media'
    and public.owns_business(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "business-media owner delete" on storage.objects;
create policy "business-media owner delete" on storage.objects
  for delete using (
    bucket_id = 'business-media'
    and public.owns_business(((storage.foldername(name))[1])::uuid)
  );

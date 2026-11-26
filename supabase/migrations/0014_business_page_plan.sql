-- AppointEase migration 0014 — business page plan (Frantz spec,
-- 2026-11-26): the public business page is rebuilt to his written
-- plan and design pictures. This adds exactly the three things the
-- new page needs:
--   * businesses.cover_url     — the wide cover photo across the top
--                                of the page (its own image, separate
--                                from the logo and the work photos).
--   * businesses.gallery_title — the owner's name for the photos
--                                section ("Our office", "Our work"…).
--                                Null = the page shows "Our work".
--   * services.price_type      — how a service's price is shown:
--       'none'  → no price text at all
--       'exact' → "$250"
--       'from'  → "from $350"
--       'free'  → "Free"
--     Backfilled from the existing price_cents so every page keeps
--     the price it shows today (a set price was exact, 0 was free,
--     null showed no real price).
-- Everything is optional/nullable beyond the price_type default, so a
-- business that fills in none of this behaves exactly as today.
-- No new tables, so no new RLS policies or grants: businesses and
-- services already carry their owner-write / public-read policies
-- from 0001–0013, and new columns ride along.

alter table public.businesses
  add column if not exists cover_url text,
  add column if not exists gallery_title text;

alter table public.services
  add column if not exists price_type text not null default 'none'
    check (price_type in ('none', 'exact', 'from', 'free'));

update public.services
  set price_type = case
    when price_cents is null then 'none'
    when price_cents = 0 then 'free'
    else 'exact'
  end;

-- AppointEase migration 0009 — make services.price_cents nullable.
-- Run after 0001–0008. MUST be applied in the Supabase SQL Editor.
--
-- WHY (owner's direct ask, 2026-11-25): "every barber has different
-- price — make it blank to discuss with the barber." A business may list
-- a service without a public price; the price is then confirmed with the
-- business directly. NULL now means "no public price" (the app shows
-- "Price confirmed with the business"); 0 still means explicitly Free.
-- The existing check (price_cents >= 0) passes for NULL, so it stays.

alter table services alter column price_cents drop not null;

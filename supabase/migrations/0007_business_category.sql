-- AppointEase migration 0007 — business category for marketplace discovery.
-- Run after 0001–0006.
--
-- Adds businesses.category (a slug from src/lib/categories.ts) so customers
-- can browse businesses by kind on /explore. Defaults to 'other' so every
-- existing row stays valid; the demo business is a barbershop.

alter table public.businesses
  add column if not exists category text not null default 'other';

update public.businesses
  set category = 'barbershops'
  where slug = 'jesus-barber-shop';

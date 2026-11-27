-- AppointEase migration 0021: rename the standard pair's follow up service.
--
-- Frantz ordered every dash out of visible copy (2026-11-26), and that
-- includes the standard pair's second service name. Rows created since
-- the pair shipped are stored as "Follow-up appointment"; the new
-- spelling is "Follow up appointment".
--
-- App code already handles both spellings: pair detection
-- (pairServiceRank and ensureStandardServices in
-- src/lib/default-service.ts) accepts the old and new names, and
-- creation always uses the new name, so this rename is safe to apply
-- at any point relative to the deploy. It touches only rows named
-- exactly "Follow-up appointment"; a business's own renamed or
-- deactivated rows keep whatever the owner set (a deactivated row
-- with the old spelling is renamed too, so the owner's pair member
-- keeps working under detection; deactivation itself is untouched).

update public.services
  set name = 'Follow up appointment'
  where name = 'Follow-up appointment';

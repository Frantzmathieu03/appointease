-- AppointEase migration 0020: who on the team sent a message.
--
-- Until now a message row knew only which SIDE sent it (sender:
-- customer | business), so a business reply in the customer's thread
-- was signed with the customer's assigned person, or the business
-- name: never with the name of the person who actually wrote it.
-- sender_user_id records the auth user who sent the message (the
-- owner, a team member, or the customer themselves), and the thread
-- signs business replies with that person's first name.
--
-- All app code feature-detects this column: before this migration
-- lands, sends simply omit it and threads fall back to the old
-- signature (assigned person, else the business name). No RLS
-- changes are needed: the existing messages policies are row level
-- and already cover the new column, and realtime payloads pick it
-- up automatically.

alter table public.messages
  add column if not exists sender_user_id uuid references auth.users (id) on delete set null;

comment on column public.messages.sender_user_id is
  'The auth user who sent this message (migration 0020). Null on rows sent before the column existed.';

-- AppointEase migration 0005 — booking confirmation numbers.
-- Run after 0001 + 0002 + 0003 (+ 0004).
--
-- Every appointment gets a unique, human-friendly confirmation number:
-- "AE-" + 6 characters from an unambiguous alphabet (no 0/O, 1/I/L), e.g.
-- AE-7K2QX9. Customers quote it on the phone; owners see it on every
-- appointment view. The app generates codes at booking time and retries
-- on collision (src/lib/confirmation.ts); the SQL generator below is the
-- column default + the backfill for rows booked before this migration.

create or replace function public.generate_confirmation_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- 31 chars
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'AE-' || code;
end;
$$;

alter table public.appointments
  add column if not exists confirmation_code text;

-- Unique guarantee first (all values are NULL so far, which never collide),
-- then backfill with retry-on-collision.
create unique index if not exists appointments_confirmation_code_idx
  on public.appointments (confirmation_code);

do $$
declare
  r record;
  candidate text;
begin
  for r in select id from public.appointments where confirmation_code is null loop
    loop
      candidate := public.generate_confirmation_code();
      begin
        update public.appointments set confirmation_code = candidate where id = r.id;
        exit;
      exception when unique_violation then
        -- astronomically unlikely; draw again
      end;
    end loop;
  end loop;
end $$;

alter table public.appointments
  alter column confirmation_code set default public.generate_confirmation_code(),
  alter column confirmation_code set not null;

-- Grants pattern (same as 0003_grants.sql): re-affirm table privileges;
-- the 0001 RLS policies on appointments are unchanged.
grant select, insert, update, delete
  on public.appointments
  to anon, authenticated, service_role;

grant execute
  on function public.generate_confirmation_code()
  to anon, authenticated, service_role;

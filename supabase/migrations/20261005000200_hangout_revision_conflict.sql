-- A stale expected revision is a business conflict, not a serialization abort.
-- PostgREST retries SQLSTATE 40001 inside its transaction runner, so raising
-- that code for a permanently stale revision can keep one request alive forever.
create or replace function private.check_hangout_revision(h public.hangouts, expected bigint) returns void
language plpgsql set search_path='' as $$
begin
 if expected is null or expected<>h.revision then
   raise exception 'Stale Hangout revision' using errcode='PT409';
 end if;
end;
$$;

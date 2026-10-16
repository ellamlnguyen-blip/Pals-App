-- TASK-033E Follow-up 00700: allow normal Auth confirmation while preserving
-- one-way invalidation of pending co-host invitations on identity loss.
begin;

create or replace function private.cohost_invitation_subject_changed() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid;
begin
  -- A trigger RECORD has only the columns of its own relation. Extract the
  -- subject from the actual source relation without resolving an unrelated
  -- relation's field (NEW.user_id on auth.users caused Auth updates to abort).
  if tg_table_schema='auth' and tg_table_name='users' then
    subject:=nullif(to_jsonb(new)->>'id','')::uuid;
  elsif tg_table_schema='public' and tg_table_name='accounts' then
    subject:=nullif(to_jsonb(new)->>'id','')::uuid;
  elsif tg_table_schema='public' and tg_table_name='university_memberships' then
    subject:=nullif(to_jsonb(new)->>'user_id','')::uuid;
  else
    raise exception 'Invalid invitation identity source' using errcode='42501';
  end if;
  if subject is null then
    raise exception 'Invalid invitation identity subject' using errcode='42501';
  end if;
  update private.cohost_invitations i
    set state='unavailable',responded_at=clock_timestamp()
    from public.hangouts h
    where i.hangout_id=h.id and i.state='pending'
      and (i.host_id=subject or i.recipient_id=subject)
      and (not private.ready_subject_campus(i.host_id,h.university_id)
        or not private.ready_subject_campus(i.recipient_id,h.university_id));
  return new;
end $$;
revoke all on function private.cohost_invitation_subject_changed()
  from public,anon,authenticated,service_role;

commit;

-- TASK-021A1b3b: five co-host/chat writers only. Existing tables, readers,
-- lifecycle helpers, triggers, grants and retained safety paths are unchanged.
begin;

-- Fresh caller/source/action authority; never accepts cached evidence or roles.
create function private.pilot_require_cohost_chat(p_operation text,p_hangout_id uuid,p_account_id uuid)
returns void language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); h public.hangouts;
begin
 if p_operation is null or p_operation not in ('remove_hangout_participant','promote_hangout_cohost','demote_hangout_cohost','step_down_hangout_cohost','send_hangout_message')
  or actor is null or p_hangout_id is null
  or (p_operation in ('remove_hangout_participant','promote_hangout_cohost','demote_hangout_cohost') and (p_account_id is null or p_account_id=actor))
  or (p_operation in ('step_down_hangout_cohost','send_hangout_message') and p_account_id is not null) then
  raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select * into h from public.hangouts where id=p_hangout_id;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 -- Base send authority deliberately excludes status/joined/block/visibility:
 -- those remain the inherited extra-chat boundary below.
 if not private.pilot_capability_enabled('hangouts') or not private.hangouts_enabled()
  or not private.ready_subject_campus(actor,h.university_id)
  or not private.ready_subject_campus(h.host_id,h.university_id)
  or exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
  or p_account_id=h.host_id then
  raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if p_operation='send_hangout_message' then
  perform private.chat_require(h.id);
  return;
 end if;
 if not private.can_read_hangout(h.id) then
  raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if p_operation='promote_hangout_cohost' then
  if h.host_id<>actor or h.status<>'published'
   or not exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=p_account_id and p.state='joined')
   or not private.ready_subject_campus(p_account_id,h.university_id)
   or private.safety_pair_blocked(h.host_id,p_account_id)
   or exists(select 1 from private.hangout_cohosts c where c.hangout_id=h.id and c.account_id=p_account_id) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 elsif p_operation='demote_hangout_cohost' then
  if h.host_id<>actor or h.status<>'published'
   or not exists(select 1 from private.hangout_cohosts c where c.hangout_id=h.id and c.account_id=p_account_id) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 elsif p_operation='step_down_hangout_cohost' then
  if h.status<>'published' or not private.effective_hangout_cohost(h.id,actor) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 elsif p_operation='remove_hangout_participant' then
  if not exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=p_account_id and p.state in ('joined','left')) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  if h.host_id<>actor and (h.status<>'published' or not private.effective_hangout_cohost(h.id,actor)
   or not exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=p_account_id and p.state='joined')
   or not private.ready_subject_campus(p_account_id,h.university_id)
   or exists(select 1 from private.hangout_cohosts c where c.hangout_id=h.id and c.account_id=p_account_id)
   or private.safety_pair_blocked(actor,p_account_id)) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end if;
end; $$;
revoke all on function private.pilot_require_cohost_chat(text,uuid,uuid) from public,anon,authenticated,service_role;

create function private.pilot_lock_cohost_chat(p_operation text,p_hangout_id uuid,p_account_id uuid)
returns table(actor_id uuid,host_id uuid,campus_id uuid,source_id uuid,locked_subject_bindings jsonb)
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; subjects uuid[]; state_subjects uuid[]; subject uuid;
 campus uuid; photo text; object_id uuid; binding jsonb; participant_state text; assignment_time timestamptz;
 memberships jsonb:='{}'::jsonb; photos jsonb:='{}'::jsonb; objects jsonb:='{}'::jsonb;
 participants jsonb:='{}'::jsonb; assignments jsonb:='{}'::jsonb;
 target_ready boolean; actor_joined boolean; actor_assignment boolean; target_participant boolean;
begin
 -- Social first preserves the existing stronger-isolation literal.
 perform private.social_hangout_mutation_lock();
 actor_id:=auth.uid();
 if actor_id is null or p_hangout_id is null or p_operation is null
  or p_operation not in ('remove_hangout_participant','promote_hangout_cohost','demote_hangout_cohost','step_down_hangout_cohost','send_hangout_message')
  or (p_operation in ('remove_hangout_participant','promote_hangout_cohost','demote_hangout_cohost') and (p_account_id is null or p_account_id=actor_id))
  or (p_operation in ('step_down_hangout_cohost','send_hangout_message') and p_account_id is not null) then
  raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.pilot_evidence_lock();
 perform 1 from private.pilot_availability where singleton for share;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 -- Required capabilities are acquired in key order; every absent row denies now.
 if p_operation='send_hangout_message' then
  perform 1 from private.pilot_capabilities where key='hangout_chat' for share;
  if not found then raise exception 'Hangout chat unavailable' using errcode='42501'; end if;
 end if;
 perform 1 from private.pilot_capabilities where key='hangouts' for share;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select * into h from public.hangouts where id=p_hangout_id for update;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 source_id:=h.id; host_id:=h.host_id; campus_id:=h.university_id;
 if p_account_id=host_id then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform 1 from private.hangout_feature_gate where singleton for share;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if p_operation='send_hangout_message' then
  perform 1 from private.hangout_chat_feature_gate where singleton for share;
  if not found then raise exception 'Hangout chat unavailable' using errcode='42501'; end if;
 end if;
 -- Classification only chooses locks; the fresh guard authorizes later.
 target_ready:=p_operation='promote_hangout_cohost'
  or (p_operation='remove_hangout_participant' and actor_id<>host_id);
 actor_joined:=p_operation in ('step_down_hangout_cohost','send_hangout_message')
  or (p_operation='remove_hangout_participant' and actor_id<>host_id);
 actor_assignment:=p_operation='step_down_hangout_cohost'
  or (p_operation='remove_hangout_participant' and actor_id<>host_id);
 target_participant:=p_operation in ('promote_hangout_cohost','remove_hangout_participant');
 select array_agg(s order by s) into subjects from
  (select distinct s from unnest(array[actor_id,host_id,case when target_ready then p_account_id end]) s where s is not null) ids;
 foreach subject in array subjects loop
  perform 1 from public.accounts where id=subject for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  perform 1 from private.pilot_account_admission where account_id=subject for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  perform 1 from auth.users where id=subject for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  select m.university_id into campus from public.university_memberships m where m.user_id=subject for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  memberships:=memberships||jsonb_build_object(subject::text,campus);
 end loop;
 for campus in select distinct value::uuid from jsonb_each_text(memberships) order by value::uuid loop
  perform 1 from public.universities c where c.id=campus for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end loop;
 foreach subject in array subjects loop
  select p.primary_photo_path into photo from public.profiles p where p.user_id=subject for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  if photo is null then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  photos:=photos||jsonb_build_object(subject::text,photo);
 end loop;
 for subject,photo in select key::uuid,value from jsonb_each_text(photos) order by value,key::uuid loop
  select o.id into object_id from storage.objects o where o.bucket_id='profile-photos' and o.name=photo and o.owner_id=subject::text for share;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  objects:=objects||jsonb_build_object(subject::text,object_id);
 end loop;
 locked_subject_bindings:='[]'::jsonb;
 foreach subject in array subjects loop
  binding:=jsonb_build_object('subject_id',subject,'membership_campus_id',memberships->>subject::text,
   'primary_photo_path',photos->>subject::text,'storage_object_id',objects->>subject::text);
  locked_subject_bindings:=locked_subject_bindings||jsonb_build_array(binding);
 end loop;
 -- Lower actual tuples are acquired in key order after the full identity set.
 select array_agg(s order by s) into state_subjects from
  (select distinct s from unnest(array[case when actor_joined then actor_id end,
    case when target_participant then p_account_id end]) s where s is not null) ids;
 if state_subjects is not null then
  foreach subject in array state_subjects loop
   if p_operation='remove_hangout_participant' and subject=p_account_id then
    select p.state into participant_state from public.hangout_participants p
     where p.hangout_id=source_id and p.account_id=subject for update;
   else
    select p.state into participant_state from public.hangout_participants p
     where p.hangout_id=source_id and p.account_id=subject for share;
   end if;
   if not found then
    if p_operation='send_hangout_message' then raise exception 'Hangout chat unavailable' using errcode='42501'; end if;
    raise exception 'Hangout operation not permitted' using errcode='42501';
   end if;
   if participant_state<>'joined' and not (p_operation='remove_hangout_participant' and actor_id=host_id
      and subject=p_account_id and participant_state='left') then
    if p_operation='send_hangout_message' then raise exception 'Hangout chat unavailable' using errcode='42501'; end if;
    raise exception 'Hangout operation not permitted' using errcode='42501';
   end if;
   participants:=participants||jsonb_build_object(subject::text,participant_state);
  end loop;
 end if;
 select array_agg(s order by s) into state_subjects from
  (select distinct s from unnest(array[case when actor_assignment then actor_id end,
    case when p_operation in ('promote_hangout_cohost','demote_hangout_cohost','remove_hangout_participant') then p_account_id end]) s where s is not null) ids;
 if state_subjects is not null then
  foreach subject in array state_subjects loop
   select c.assigned_at into assignment_time from private.hangout_cohosts c
    where c.hangout_id=source_id and c.account_id=subject for share;
   if not found then
    if (actor_assignment and subject=actor_id) or p_operation='demote_hangout_cohost' then
     raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
   else
    assignments:=assignments||jsonb_build_object(subject::text,assignment_time);
   end if;
  end loop;
 end if;
 -- All waits finished. Bind every current predicate to the actual locked tuple,
 -- never a fresh EXISTS that could accept an unlocked replacement row.
 foreach subject in array subjects loop
  if not private.ready_subject_campus(subject,campus_id)
   or (memberships->>subject::text)::uuid is distinct from campus_id
   or not exists(select 1 from public.university_memberships m where m.user_id=subject and m.university_id=(memberships->>subject::text)::uuid)
   or not exists(select 1 from public.profiles p where p.user_id=subject and p.primary_photo_path=photos->>subject::text)
   or not exists(select 1 from storage.objects o where o.id=(objects->>subject::text)::uuid and o.bucket_id='profile-photos' and o.name=photos->>subject::text and o.owner_id=subject::text) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end loop;
 -- Bind held state too. An absent required tuple never reaches this phase.
 for subject,participant_state in select key::uuid,value from jsonb_each_text(participants) order by key::uuid loop
  if not exists(select 1 from public.hangout_participants p where p.hangout_id=source_id
   and p.account_id=subject and p.state=participant_state) then
   if p_operation='send_hangout_message' then raise exception 'Hangout chat unavailable' using errcode='42501'; end if;
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end loop;
 for subject,assignment_time in select key::uuid,value::timestamptz from jsonb_each_text(assignments) order by key::uuid loop
  if not exists(select 1 from private.hangout_cohosts c where c.hangout_id=source_id
   and c.account_id=subject and c.assigned_at=assignment_time) then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 end loop;
 perform private.pilot_require_cohost_chat(p_operation,p_hangout_id,p_account_id);
 return next;
end; $$;
revoke all on function private.pilot_lock_cohost_chat(text,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.promote_hangout_cohost(p_hangout_id uuid,p_account_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; next_revision bigint;
begin
 select * into evidence from private.pilot_lock_cohost_chat('promote_hangout_cohost',p_hangout_id,p_account_id);
 perform private.pilot_require_cohost_chat('promote_hangout_cohost',p_hangout_id,p_account_id);
 -- Re-read the held source/revision only after every evidence/state wait.
 select * into h from public.hangouts where id=evidence.source_id;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.pilot_require_cohost_chat('promote_hangout_cohost',p_hangout_id,p_account_id);
 insert into private.hangout_cohosts(hangout_id,account_id) values(h.id,p_account_id);
 update public.hangouts set revision=revision+1,updated_at=clock_timestamp()
  where id=h.id returning revision into next_revision;
 return next_revision;
end; $$;

create or replace function public.demote_hangout_cohost(p_hangout_id uuid,p_account_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; next_revision bigint;
begin
 select * into evidence from private.pilot_lock_cohost_chat('demote_hangout_cohost',p_hangout_id,p_account_id);
 perform private.pilot_require_cohost_chat('demote_hangout_cohost',p_hangout_id,p_account_id);
 -- Re-read the held source/revision only after every evidence/state wait.
 select * into h from public.hangouts where id=evidence.source_id;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.pilot_require_cohost_chat('demote_hangout_cohost',p_hangout_id,p_account_id);
 delete from private.hangout_cohosts where hangout_id=h.id and account_id=p_account_id;
 update public.hangouts set revision=revision+1,updated_at=clock_timestamp()
  where id=h.id returning revision into next_revision;
 return next_revision;
end; $$;

create or replace function public.step_down_hangout_cohost(p_hangout_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; next_revision bigint;
begin
 select * into evidence from private.pilot_lock_cohost_chat('step_down_hangout_cohost',p_hangout_id,null);
 perform private.pilot_require_cohost_chat('step_down_hangout_cohost',p_hangout_id,null);
 -- Re-read the held source/revision only after every evidence/state wait.
 select * into h from public.hangouts where id=evidence.source_id;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.pilot_require_cohost_chat('step_down_hangout_cohost',p_hangout_id,null);
 delete from private.hangout_cohosts where hangout_id=h.id and account_id=auth.uid();
 update public.hangouts set revision=revision+1,updated_at=clock_timestamp()
  where id=h.id returning revision into next_revision;
 return next_revision;
end; $$;

create or replace function public.remove_hangout_participant(p_hangout_id uuid,p_account_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; next_revision bigint;
begin
 select * into evidence from private.pilot_lock_cohost_chat('remove_hangout_participant',p_hangout_id,p_account_id);
 perform private.pilot_require_cohost_chat('remove_hangout_participant',p_hangout_id,p_account_id);
 -- Re-read the held source/revision only after every evidence/state wait.
 select * into h from public.hangouts where id=evidence.source_id;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.pilot_require_cohost_chat('remove_hangout_participant',p_hangout_id,p_account_id);
 perform private.safety_record_joined_overlap(h.id,p_account_id);
 update public.hangout_participants set state='removed',removed_at=clock_timestamp(),updated_at=clock_timestamp()
  where hangout_id=h.id and account_id=p_account_id and state in ('joined','left');
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 update public.hangouts set revision=revision+1,
  updated_at=case when status='cancelled' then updated_at else clock_timestamp() end
  where id=h.id returning revision into next_revision;
 return next_revision;
end; $$;

create or replace function public.send_hangout_message(p_hangout_id uuid, p_request_id uuid, p_body text)
returns table (message_id uuid, sequence bigint, body text, created_at timestamptz,
  mine boolean, author_id uuid, author_label text)
language plpgsql volatile security definer set search_path = '' as $$
declare evidence record; actor uuid; h public.hangouts; normalized text;
  fingerprint text; old_message uuid; old_fingerprint text; conversation uuid;
  new_sequence bigint; new_message uuid;
begin
  select * into evidence from private.pilot_lock_cohost_chat('send_hangout_message',p_hangout_id,null);
  actor:=evidence.actor_id;
  select * into h from public.hangouts where id=evidence.source_id;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  perform private.pilot_require_cohost_chat('send_hangout_message',p_hangout_id,null);
  if p_request_id is null or p_body is null then
    raise exception 'Invalid Hangout message' using errcode = '22023';
  end if;
  normalized := private.profile_trim(p_body);
  if length(normalized) not between 1 and 2000 then
    raise exception 'Invalid Hangout message' using errcode = '22023';
  end if;
  fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(normalized, 'UTF8')), 'hex');
  select r.message_id, r.payload_fingerprint into old_message, old_fingerprint
    from private.hangout_message_requests r
    where r.hangout_id = h.id and r.author_id = actor and r.request_id = p_request_id;
  if found then
    if old_fingerprint <> fingerprint then
      raise exception 'Message request conflict' using errcode = '23505';
    end if;
    perform private.pilot_require_cohost_chat('send_hangout_message',p_hangout_id,null);
    return query select m.id, m.sequence, m.body, m.created_at, true, actor, null::text
      from private.hangout_messages m where m.id = old_message;
    return;
  end if;
  perform private.pilot_require_cohost_chat('send_hangout_message',p_hangout_id,null);
  insert into private.hangout_conversations(hangout_id) values (h.id)
    on conflict(hangout_id) do nothing;
  update private.hangout_conversations c set next_sequence = c.next_sequence + 1
    where c.hangout_id = h.id returning c.id, c.next_sequence - 1 into conversation, new_sequence;
  insert into private.hangout_messages(conversation_id, author_id, sequence, body)
    values (conversation, actor, new_sequence, normalized) returning id into new_message;
  insert into private.hangout_message_requests(hangout_id, author_id, request_id, message_id, payload_fingerprint)
    values (h.id, actor, p_request_id, new_message, fingerprint);
  return query select m.id, m.sequence, m.body, m.created_at, true, actor, null::text
    from private.hangout_messages m where m.id = new_message;
end;
$$;

-- Public CREATE OR REPLACE preserves the existing authenticated-only ACLs.
alter function private.pilot_require_cohost_chat(text,uuid,uuid) owner to postgres;
alter function private.pilot_lock_cohost_chat(text,uuid,uuid) owner to postgres;
commit;

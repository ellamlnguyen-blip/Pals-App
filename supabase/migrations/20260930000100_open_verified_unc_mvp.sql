-- TASK-027 / ADR-0028: verified UNC access without nominated roster admission.
-- The roster management tables remain private historical/admin artifacts. No
-- student source path below consults them. Capability and source gates retain
-- their current defaults for a separately reviewed target activation.
begin;
create or replace function private.pilot_owner_subject_eligible(subject uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_is_available() and private.pilot_capability_enabled('onboarding')
 and exists(select 1 from public.accounts a
 join auth.users u on u.id=a.id
 join public.university_memberships m on m.user_id=a.id
 join public.universities c on c.id=m.university_id
 where a.id=subject and a.status='active' and c.slug='unc-chapel-hill' and c.active
 and u.email_confirmed_at is not null and m.verified_at is not null
 and lower(u.email)=lower(m.verification_email)
 and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
 and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains));
$$;

create or replace function private.ready_subject_campus(subject uuid,campus uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_is_available() and exists(select 1 from public.accounts a
 join auth.users u on u.id=a.id
 join public.university_memberships m on m.user_id=a.id
 join public.universities c on c.id=m.university_id
 join public.profiles p on p.user_id=a.id
 join storage.objects o on o.bucket_id='profile-photos' and o.name=p.primary_photo_path
  and o.owner_id=a.id::text and split_part(o.name,'/',1)=a.id::text
 where a.id=subject and a.status='active' and c.id=campus and c.active and c.slug='unc-chapel-hill'
 and u.email_confirmed_at is not null and m.verified_at is not null
 and lower(u.email)=lower(m.verification_email)
 and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
 and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains) and p.is_complete);
$$;

create or replace function public.get_access_state() returns text
language sql stable security definer set search_path='' as $$
 select case
  when (select auth.uid()) is null or not exists(select 1 from public.accounts where id=(select auth.uid())) then 'signed_out'
  when not private.account_is_active() then 'restricted'
  when not private.pilot_is_available() then 'pilot_unavailable'
  when not private.has_verified_membership() or not exists(select 1 from public.university_memberships m
    join public.universities c on c.id=m.university_id where m.user_id=(select auth.uid()) and c.slug='unc-chapel-hill') then 'unverified'
  when not exists(select 1 from public.profiles p join storage.objects o
    on o.bucket_id='profile-photos' and o.name=p.primary_photo_path and o.owner_id=p.user_id::text
    and split_part(o.name,'/',1)=p.user_id::text
    where p.user_id=(select auth.uid()) and p.is_complete) then 'onboarding'
  else 'ready' end;
$$;

create or replace function private.pilot_lock_owner_evidence(subject uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare campus uuid;
begin
 perform private.pilot_evidence_lock();
 perform 1 from private.pilot_availability where singleton for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 perform 1 from private.pilot_capabilities where key='onboarding' for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 -- One involved account, hence trivially sorted UUID order.
 perform 1 from public.accounts where id=subject for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 perform 1 from auth.users where id=subject for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 select university_id into campus from public.university_memberships where user_id=subject for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 perform 1 from public.universities where id=campus for share;
 if not found then raise exception 'Owner operation unavailable' using errcode='42501'; end if;
 -- This separate volatile statement receives a fresh READ COMMITTED snapshot.
 if subject is null or not private.pilot_owner_subject_eligible(subject)
  or not exists(select 1 from public.university_memberships where user_id=subject and university_id=campus) then
  raise exception 'Owner operation unavailable' using errcode='42501'; end if;
end; $$;

create or replace function private.pilot_lock_ordinary_lifecycle(p_operation text,p_hangout_id uuid,p_request_id uuid default null)
returns table(actor_id uuid,host_id uuid,campus_id uuid,source_row public.hangouts,prior_hangout_id uuid,prior_payload_fingerprint text,locked_subject_bindings jsonb)
language plpgsql volatile security definer set search_path='' as $$
declare subjects uuid[]; subject uuid; campus uuid; photo text; object_id uuid; binding jsonb;
 locked_source public.hangouts;
 memberships jsonb:='{}'::jsonb; photos jsonb:='{}'::jsonb; objects jsonb:='{}'::jsonb;
begin
 -- Social is first, including its established stronger-isolation error.
 perform private.social_hangout_mutation_lock();
 actor_id:=auth.uid();
 if actor_id is null or p_operation is null or p_operation not in ('create_hangout','edit_hangout','cancel_hangout','join_hangout','leave_hangout','set_hangout_joining')
  or (p_operation='create_hangout' and p_hangout_id is not null)
  or (p_operation<>'create_hangout' and (p_hangout_id is null or p_request_id is not null)) then
  raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.pilot_evidence_lock();
 perform 1 from private.pilot_availability where singleton for share;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform 1 from private.pilot_capabilities where key='hangouts' for share;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if not private.pilot_capability_enabled('hangouts') then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if p_operation='create_hangout' then
  if p_request_id is not null then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text||p_request_id::text,0));
   select r.hangout_id,r.payload_fingerprint into prior_hangout_id,prior_payload_fingerprint
    from private.hangout_create_requests r where r.host_id=actor_id and r.request_id=p_request_id;
  end if;
  if prior_hangout_id is not null then
   select h.* into locked_source from public.hangouts h where h.id=prior_hangout_id for update;
   if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
   source_row:=locked_source;
  end if;
 else
  select h.* into locked_source from public.hangouts h where h.id=p_hangout_id for update;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  source_row:=locked_source;
 end if;
 host_id:=coalesce(source_row.host_id,actor_id);
 campus_id:=source_row.university_id;
 perform 1 from private.hangout_feature_gate where singleton for share;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select array_agg(s order by s) into subjects from (select distinct unnest(array[actor_id,host_id]) s) ids;
 foreach subject in array subjects loop
  perform 1 from public.accounts where id=subject for share;
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
 if campus_id is null then campus_id:=(memberships->>actor_id::text)::uuid; end if;
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
 locked_subject_bindings:='[]';
 foreach subject in array subjects loop
  binding:=jsonb_build_object('subject_id',subject,'membership_campus_id',memberships->>subject::text,
   'primary_photo_path',photos->>subject::text,'storage_object_id',objects->>subject::text);
  locked_subject_bindings:=locked_subject_bindings||jsonb_build_array(binding);
 end loop;
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
 -- Original lower state boundary follows the complete identity phases. Source
 -- parent UPDATE prevents new FK-bound state rows from appearing behind us.
 if source_row.id is not null then
  perform 1 from public.hangout_participants p where p.hangout_id=source_row.id and p.account_id=actor_id for update;
  if not found and p_operation='leave_hangout' then
   raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  if p_operation in ('edit_hangout','set_hangout_joining') and actor_id<>host_id then
   perform 1 from private.hangout_cohosts c where c.hangout_id=source_row.id and c.account_id=actor_id for share;
   if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  end if;
 end if;
 perform private.pilot_require_ordinary_lifecycle(p_operation,coalesce(p_hangout_id,prior_hangout_id));
 return query select actor_id,host_id,campus_id,source_row,prior_hangout_id,prior_payload_fingerprint,locked_subject_bindings;
end; $$;

create or replace function private.pilot_lock_cohost_chat(p_operation text,p_hangout_id uuid,p_account_id uuid)
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

-- Keep the old private helper from making admission an alternate authority.
create or replace function private.pilot_caller_is_admitted() returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_owner_subject_eligible((select auth.uid()));
$$;
revoke all on function private.pilot_caller_is_admitted() from public,anon,authenticated,service_role;
commit;

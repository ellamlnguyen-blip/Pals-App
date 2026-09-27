-- TASK-021A1b3a: ordinary lifecycle only; retained/safety/chat callers unchanged.
begin;

-- A fresh statement guard. It derives its caller and current source itself;
-- it accepts no subject, campus, role or readiness authority from its caller.
create function private.pilot_require_ordinary_lifecycle(p_operation text,p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); h public.hangouts;
begin
 if p_operation is null or p_operation not in ('create_hangout','edit_hangout','cancel_hangout','join_hangout','leave_hangout','set_hangout_joining')
  or actor is null or not private.pilot_capability_enabled('hangouts') or not private.hangouts_enabled()
  or private.ready_campus() is null then
  raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if p_hangout_id is null then
  if p_operation<>'create_hangout' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  return;
 end if;
 select * into h from public.hangouts where id=p_hangout_id;
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if not private.can_read_hangout(h.id) then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if p_operation='create_hangout' and h.host_id<>actor
  or p_operation='cancel_hangout' and (h.status<>'published' or h.host_id<>actor)
  or p_operation in ('edit_hangout','set_hangout_joining') and (h.status<>'published' or (h.host_id<>actor and not private.effective_hangout_cohost(h.id,actor)))
  or p_operation='join_hangout' and (h.status<>'published' or h.joining_state<>'open'
    or exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.state='joined' and p.account_id<>actor and private.safety_pair_blocked(actor,p.account_id))
    or exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=actor and p.state='removed'))
  or p_operation='leave_hangout' and (h.host_id=actor or not exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=actor and p.state='joined')) then
  raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
end; $$;
revoke all on function private.pilot_require_ordinary_lifecycle(text,uuid) from public,anon,authenticated,service_role;

create function private.pilot_lock_ordinary_lifecycle(p_operation text,p_hangout_id uuid,p_request_id uuid default null)
returns table(actor_id uuid,host_id uuid,campus_id uuid,source_row public.hangouts,prior_hangout_id uuid,prior_payload_fingerprint text,locked_subject_bindings jsonb)
language plpgsql volatile security definer set search_path='' as $$
declare subjects uuid[]; subject uuid; campus uuid; photo text; object_id uuid; binding jsonb;
 memberships jsonb:='{}'; photos jsonb:='{}'; objects jsonb:='{}';
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
   select h.* into source_row from public.hangouts h where h.id=prior_hangout_id for update;
   if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
  end if;
 else
  select h.* into source_row from public.hangouts h where h.id=p_hangout_id for update;
  if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
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
 return next;
end; $$;
revoke all on function private.pilot_lock_ordinary_lifecycle(text,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.create_hangout(p_request_id uuid,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; campus uuid; result uuid; existing_id uuid; existing_fingerprint text; fingerprint text; normalized_private text;
begin
 select * into evidence from private.pilot_lock_ordinary_lifecycle('create_hangout',null,p_request_id);
 campus:=evidence.campus_id;
 existing_id:=evidence.prior_hangout_id; existing_fingerprint:=evidence.prior_payload_fingerprint;
 perform private.pilot_require_ordinary_lifecycle('create_hangout',existing_id);
 perform private.validate_hangout_input(p_title,p_starts_at,p_public_place,p_public_latitude,p_public_longitude,p_description,p_ends_at,p_campus_zone,p_visibility,p_location_precision,p_eligibility);
 perform private.validate_hangout_instructions(p_private_instructions);
 if p_request_id is null then raise exception 'Invalid Hangout input' using errcode='22023'; end if;
 normalized_private=nullif(private.profile_trim(p_private_instructions),'');
 fingerprint=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_array(private.profile_trim(p_title),extract(epoch from p_starts_at),
   private.profile_trim(p_public_place),p_public_latitude,p_public_longitude,
   nullif(private.profile_trim(p_description),''),extract(epoch from p_ends_at),
   nullif(private.profile_trim(p_campus_zone),''),normalized_private,
   p_visibility,p_location_precision,p_eligibility)::text,'UTF8')),'hex');
 if existing_id is not null then
   -- The current gate/readiness/campus and row access must still hold. Never
   -- replay private content, even when the original write had it.
   if not private.can_read_hangout(existing_id) then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
   if existing_fingerprint<>fingerprint then raise exception 'Creation request conflict' using errcode='23505'; end if;
   perform private.pilot_require_ordinary_lifecycle('create_hangout',existing_id);
   return existing_id;
 end if;
 if p_starts_at<clock_timestamp() or p_starts_at>clock_timestamp()+interval '366 days' then
   raise exception 'Invalid Hangout input' using errcode='22023';
 end if;
 perform private.pilot_require_ordinary_lifecycle('create_hangout',null);
 insert into public.hangouts(university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude,description,ends_at,campus_zone)
 values(campus,auth.uid(),private.profile_trim(p_title),p_starts_at,private.profile_trim(p_public_place),p_public_latitude,p_public_longitude,nullif(private.profile_trim(p_description),''),p_ends_at,nullif(private.profile_trim(p_campus_zone),'')) returning id into result;
 insert into public.hangout_participants(hangout_id,account_id,state) values(result,auth.uid(),'joined');
 if normalized_private is not null then
   insert into public.hangout_private_locations(hangout_id,instructions) values(result,normalized_private);
 end if;
 insert into private.hangout_create_requests(host_id,request_id,hangout_id,payload_fingerprint) values(auth.uid(),p_request_id,result,fingerprint);
 return result;
end;
$$;

create or replace function public.edit_hangout(p_hangout_id uuid,p_expected_revision bigint,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; next_revision bigint; normalized_private text; old_private text; material boolean;
begin
 select * into evidence from private.pilot_lock_ordinary_lifecycle('edit_hangout',p_hangout_id);
 h:=evidence.source_row;
 perform private.pilot_require_ordinary_lifecycle('edit_hangout',p_hangout_id);
 if (h.host_id<>auth.uid() and not private.effective_hangout_cohost(h.id,auth.uid())) or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.validate_hangout_input(p_title,p_starts_at,p_public_place,p_public_latitude,p_public_longitude,p_description,p_ends_at,p_campus_zone,p_visibility,p_location_precision,p_eligibility);
 perform private.validate_hangout_instructions(p_private_instructions);
 if p_starts_at is distinct from h.starts_at and (p_starts_at<clock_timestamp() or p_starts_at>clock_timestamp()+interval '366 days') then
   raise exception 'Invalid Hangout input' using errcode='22023'; end if;
 normalized_private=nullif(private.profile_trim(p_private_instructions),'');
 select instructions into old_private from public.hangout_private_locations where hangout_id=h.id;
 perform private.pilot_require_ordinary_lifecycle('edit_hangout',p_hangout_id);
 update public.hangouts set title=private.profile_trim(p_title),starts_at=p_starts_at,public_place=private.profile_trim(p_public_place),public_latitude=p_public_latitude,public_longitude=p_public_longitude,description=nullif(private.profile_trim(p_description),''),ends_at=p_ends_at,campus_zone=nullif(private.profile_trim(p_campus_zone),''),revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 if normalized_private is null then delete from public.hangout_private_locations where hangout_id=h.id;
 else insert into public.hangout_private_locations(hangout_id,instructions) values(h.id,normalized_private)
  on conflict(hangout_id) do update set instructions=excluded.instructions,updated_at=clock_timestamp(); end if;
 material:=row(h.title,h.starts_at,h.public_place,h.public_latitude,h.public_longitude,h.description,h.ends_at,h.campus_zone,old_private)
  is distinct from row(private.profile_trim(p_title),p_starts_at,private.profile_trim(p_public_place),p_public_latitude,p_public_longitude,
   nullif(private.profile_trim(p_description),''),p_ends_at,nullif(private.profile_trim(p_campus_zone),''),normalized_private);
 if material then perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_edited'); end if;
 return next_revision;
end; $$;

create or replace function public.cancel_hangout(p_hangout_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; next_revision bigint;
begin
 select * into evidence from private.pilot_lock_ordinary_lifecycle('cancel_hangout',p_hangout_id);
 h:=evidence.source_row;
 perform private.pilot_require_ordinary_lifecycle('cancel_hangout',p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.pilot_require_ordinary_lifecycle('cancel_hangout',p_hangout_id);
 update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_cancelled');
 return next_revision;
end; $$;

create or replace function public.join_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare evidence record; h public.hangouts; participant_state text; did_join boolean;
begin
 select * into evidence from private.pilot_lock_ordinary_lifecycle('join_hangout',p_hangout_id);
 h:=evidence.source_row;
 perform private.pilot_require_ordinary_lifecycle('join_hangout',p_hangout_id);
  if h.status <> 'published' or h.joining_state <> 'open' then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  if exists(select 1 from public.hangout_participants p where p.hangout_id = h.id
    and p.state = 'joined' and p.account_id <> auth.uid()
    and private.safety_pair_blocked(auth.uid(), p.account_id)) then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
  select state into participant_state from public.hangout_participants
    where hangout_id = h.id and account_id = auth.uid();
  if participant_state = 'removed' then
    raise exception 'Hangout operation not permitted' using errcode = '42501';
  end if;
 perform private.pilot_require_ordinary_lifecycle('join_hangout',p_hangout_id);
  if participant_state = 'joined' then return; end if;
  insert into public.hangout_participants(hangout_id, account_id, state)
    values (h.id, auth.uid(), 'joined')
    on conflict(hangout_id, account_id) do update
      set state = 'joined', joined_at = clock_timestamp(), left_at = null,
          updated_at = clock_timestamp()
      where hangout_participants.state = 'left';
  did_join := found;
  if did_join then
    perform private.safety_record_joined_overlap(h.id, auth.uid());
    perform private.record_large_hangout_join(h.id);
    perform private.notification_emit_hangout(gen_random_uuid(), h.id, auth.uid(), 'hangout_joined');
  end if;
end;
$$;

create or replace function public.leave_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; was_cohost boolean;
begin
 select * into evidence from private.pilot_lock_ordinary_lifecycle('leave_hangout',p_hangout_id);
 h:=evidence.source_row;
 perform private.pilot_require_ordinary_lifecycle('leave_hangout',p_hangout_id);
 if h.host_id=auth.uid() then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 was_cohost:=exists(select 1 from private.hangout_cohosts c where c.hangout_id=h.id and c.account_id=auth.uid());
 perform private.pilot_require_ordinary_lifecycle('leave_hangout',p_hangout_id);
 perform private.safety_record_joined_overlap(h.id,auth.uid());
 update public.hangout_participants set state='left',left_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=h.id and account_id=auth.uid() and state='joined';
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if was_cohost then
   update public.hangouts set revision=revision+1,
     updated_at=case when status='cancelled' then updated_at else clock_timestamp() end
     where id=h.id;
 end if;
 perform private.notification_emit_hangout(gen_random_uuid(),h.id,auth.uid(),'hangout_left');
end; $$;

create or replace function public.set_hangout_joining(p_hangout_id uuid,p_expected_revision bigint,p_joining_state text) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; next_revision bigint;
begin
 select * into evidence from private.pilot_lock_ordinary_lifecycle('set_hangout_joining',p_hangout_id);
 h:=evidence.source_row;
 perform private.pilot_require_ordinary_lifecycle('set_hangout_joining',p_hangout_id);
 if (h.host_id<>auth.uid() and not private.effective_hangout_cohost(h.id,auth.uid())) or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 if p_joining_state is null or p_joining_state not in ('open','closed') then raise exception 'Invalid joining state' using errcode='22023'; end if;
 perform private.pilot_require_ordinary_lifecycle('set_hangout_joining',p_hangout_id);
 update public.hangouts set joining_state=p_joining_state,revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 return next_revision;
end;
$$;

commit;

-- ADR-0027 / TASK-021A1a. Private authority only; existing student checks unchanged.
begin;
create table private.pilot_account_admission (
 account_id uuid primary key references public.accounts(id) on delete cascade,
 state text not null check(state in ('active','revoked')),
 revision bigint not null check(revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table private.pilot_admission_managers (like private.pilot_account_admission including defaults including constraints);
alter table private.pilot_admission_managers add primary key(account_id);
alter table private.pilot_admission_managers add foreign key(account_id) references public.accounts(id) on delete cascade;
create table private.pilot_availability (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 revision bigint not null check(revision>0), created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
create table private.pilot_capabilities (
 key text primary key check(key in ('onboarding','hangouts','hangout_chat','calendar','people','friendship','dm','notifications','attendance','optional_profile','extra_photos','analytics','large_hangout_safeguards')),
 enabled boolean not null default false, revision bigint not null check(revision>0),
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
insert into private.pilot_availability(singleton,enabled,revision) values(true,false,1);
insert into private.pilot_capabilities(key,enabled,revision) select unnest(array['onboarding','hangouts','hangout_chat','calendar','people','friendship','dm','notifications','attendance','optional_profile','extra_photos','analytics','large_hangout_safeguards']),false,1;
create table private.pilot_management_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null,
 operation text not null check(operation in ('admission','policy')), target_id uuid, policy_key text,
 previous_value jsonb, new_value jsonb not null, previous_revision bigint not null, new_revision bigint not null,
 reason text not null check(reason=private.profile_trim(reason) and char_length(reason) between 1 and 2000),
 request_id uuid not null, occurred_at timestamptz not null default clock_timestamp(),
 unique(actor_id,request_id), check((operation='admission')=(target_id is not null)), check((operation='policy')=(policy_key is not null))
);
create table private.pilot_management_requests (
 actor_id uuid not null, request_id uuid not null, fingerprint jsonb not null,
 result_value jsonb not null, result_revision bigint not null, audit_id uuid not null references private.pilot_management_audit(id),
 primary key(actor_id,request_id)
);
create table private.pilot_manager_audit (
 id uuid primary key default gen_random_uuid(), account_id uuid not null, executor_session_user text not null,
 executor_original_role text not null, executor_backend_pid integer not null,
 previous_state text, new_state text not null check(new_state in ('active','revoked')),
 previous_revision bigint not null, new_revision bigint not null,
 reason text not null check(reason=private.profile_trim(reason) and char_length(reason) between 1 and 2000),
 request_id uuid not null, occurred_at timestamptz not null default clock_timestamp()
);
alter table private.pilot_account_admission enable row level security;
alter table private.pilot_admission_managers enable row level security;
alter table private.pilot_availability enable row level security;
alter table private.pilot_capabilities enable row level security;
alter table private.pilot_management_audit enable row level security;
alter table private.pilot_management_requests enable row level security;
alter table private.pilot_manager_audit enable row level security;
revoke all on private.pilot_account_admission,private.pilot_admission_managers,private.pilot_availability,private.pilot_capabilities,private.pilot_management_audit,private.pilot_management_requests,private.pilot_manager_audit from public,anon,authenticated;

-- Internal read primitives; no client existence oracle and no old helper rewrite.
create function private.pilot_is_available() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.pilot_availability where singleton and enabled);
$$;
create function private.pilot_capability_enabled(p_key text) returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_is_available() and exists(select 1 from private.pilot_capabilities where key=p_key and enabled);
$$;
create function private.pilot_caller_is_admitted() returns boolean
language sql stable security definer set search_path='' as $$
 select private.pilot_is_available() and exists(select 1 from private.pilot_account_admission a join public.accounts c on c.id=a.account_id where a.account_id=auth.uid() and a.state='active' and c.status='active');
$$;
revoke all on function private.pilot_is_available(),private.pilot_capability_enabled(text),private.pilot_caller_is_admitted() from public,anon,authenticated,service_role;

create function private.pilot_evidence_lock() returns void
language plpgsql volatile security definer set search_path='' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock_shared(16027,1);
end; $$;
create function private.pilot_evidence_write_lock() returns void
language plpgsql volatile security definer set search_path='' as $$
begin
 perform private.social_hangout_mutation_lock();
 perform pg_catalog.pg_advisory_xact_lock(16027,1);
end; $$;
-- Exact global boundary protects missing rows too. Accounts are sorted; current
-- source writers are protected by actual row locks, not advisory participation.
create function private.pilot_lock_management(p_actor uuid,p_target uuid,p_policy_key text,p_manager_write boolean default false) returns void
language plpgsql volatile security definer set search_path='' as $$
declare subject uuid;
begin
 perform private.pilot_evidence_write_lock();
 if p_policy_key='availability' then perform 1 from private.pilot_availability where singleton for update;
 else perform 1 from private.pilot_availability where singleton for share; end if;
 perform 1 from private.pilot_capabilities where key<>coalesce(p_policy_key,'') order by key for share;
 if p_policy_key is not null and p_policy_key<>'availability' then perform 1 from private.pilot_capabilities where key=p_policy_key for update; end if;
 for subject in select distinct v from unnest(array[p_actor,p_target]) v where v is not null order by v loop
  perform 1 from public.accounts where id=subject for share;
 end loop;
 for subject in select distinct v from unnest(array[p_actor,p_target]) v where v is not null order by v loop
  if p_manager_write and subject=p_target then perform 1 from private.pilot_admission_managers where account_id=subject for update;
  else perform 1 from private.pilot_admission_managers where account_id=subject for share; end if;
 end loop;
 for subject in select distinct v from unnest(array[p_actor,p_target]) v where v is not null order by v loop
  if not p_manager_write and subject=p_target and p_policy_key is null then perform 1 from private.pilot_account_admission where account_id=subject for update;
  else perform 1 from private.pilot_account_admission where account_id=subject for share; end if;
 end loop;
end; $$;
create function private.pilot_require_manager() returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.accounts where id=actor and status='active')
  or not exists(select 1 from private.pilot_admission_managers where account_id=actor and state='active') then
  raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 return actor;
end; $$;
create function private.pilot_require_activation(p_target uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare campus uuid;
begin
 perform 1 from auth.users where id=p_target for share;
 select university_id into campus from public.university_memberships where user_id=p_target for share;
 perform 1 from public.universities where id=campus for share;
 -- Separate statement after locks/waits: campus came from locked current tuple.
 if not exists(select 1 from public.accounts a join auth.users u on u.id=a.id
  join public.university_memberships m on m.user_id=a.id join public.universities c on c.id=m.university_id
  where a.id=p_target and a.status='active' and c.id=campus and c.slug='unc-chapel-hill' and c.active
   and u.email_confirmed_at is not null and m.verified_at is not null
   and lower(u.email)=lower(m.verification_email) and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
   and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains)) then
  raise exception 'Pilot management unavailable' using errcode='42501'; end if;
end; $$;
create function private.reject_pilot_evidence_change() returns trigger
language plpgsql security definer set search_path='' as $$
begin raise exception 'Pilot evidence is immutable' using errcode='42501'; end; $$;
create trigger pilot_management_audit_immutable before update or delete on private.pilot_management_audit for each row execute function private.reject_pilot_evidence_change();
create trigger pilot_management_requests_immutable before update or delete on private.pilot_management_requests for each row execute function private.reject_pilot_evidence_change();
create trigger pilot_manager_audit_immutable before update or delete on private.pilot_manager_audit for each row execute function private.reject_pilot_evidence_change();

create function public.set_pilot_account_admission(p_account_id uuid,p_state text,p_expected_revision bigint,p_reason text,p_request_id uuid)
returns table(state text,revision bigint)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); reason text:=private.profile_trim(p_reason); prior private.pilot_management_requests%rowtype;
 old private.pilot_account_admission%rowtype; fingerprint jsonb; saved_audit uuid;
begin
 perform private.pilot_lock_management(actor,p_account_id,null);
 perform private.pilot_require_manager();
 if p_account_id is null or p_state is null or p_state not in ('active','revoked') or p_expected_revision is null or p_expected_revision<0
  or p_request_id is null or reason is null or char_length(reason) not between 1 and 2000 then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 fingerprint:=jsonb_build_array('admission',p_account_id,p_state,p_expected_revision,reason);
 select * into prior from private.pilot_management_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if prior.fingerprint<>fingerprint then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
  perform private.pilot_require_manager(); state:=prior.result_value#>>'{}'; revision:=prior.result_revision; return next; return;
 end if;
 if not exists(select 1 from public.accounts where id=p_account_id) then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 if p_state='active' then perform private.pilot_require_activation(p_account_id); end if;
 perform private.pilot_require_manager();
 select * into old from private.pilot_account_admission where account_id=p_account_id;
 if coalesce(old.revision,0)<>p_expected_revision then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 state:=p_state; revision:=case when old.state=p_state then old.revision else coalesce(old.revision,0)+1 end;
 if old.account_id is null then insert into private.pilot_account_admission(account_id,state,revision) values(p_account_id,p_state,revision);
 elsif old.state<>p_state then update private.pilot_account_admission set state=p_state,revision=set_pilot_account_admission.revision,updated_at=clock_timestamp() where account_id=p_account_id; end if;
 insert into private.pilot_management_audit(actor_id,operation,target_id,previous_value,new_value,previous_revision,new_revision,reason,request_id)
 values(actor,'admission',p_account_id,to_jsonb(old.state),to_jsonb(p_state),coalesce(old.revision,0),revision,reason,p_request_id) returning id into saved_audit;
 insert into private.pilot_management_requests values(actor,p_request_id,fingerprint,to_jsonb(p_state),revision,saved_audit);
 return next;
end; $$;
create function public.set_pilot_policy(p_key text,p_enabled boolean,p_expected_revision bigint,p_reason text,p_request_id uuid)
returns table(enabled boolean,revision bigint)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); reason text:=private.profile_trim(p_reason); prior private.pilot_management_requests%rowtype;
 old_value boolean; old_revision bigint; fingerprint jsonb; saved_audit uuid;
begin
 perform private.pilot_lock_management(actor,null,p_key); perform private.pilot_require_manager();
 if p_key is null or p_key not in ('availability','onboarding','hangouts','hangout_chat','calendar','people','friendship','dm','notifications','attendance','optional_profile','extra_photos','analytics','large_hangout_safeguards') or p_enabled is null or p_expected_revision is null or p_expected_revision<0 or p_request_id is null
  or reason is null or char_length(reason) not between 1 and 2000 then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 if not exists(select 1 from private.pilot_availability where singleton)
  or (p_key<>'availability' and not exists(select 1 from private.pilot_capabilities where key=p_key)) then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 fingerprint:=jsonb_build_array('policy',p_key,p_enabled,p_expected_revision,reason);
 select * into prior from private.pilot_management_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if prior.fingerprint<>fingerprint then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
  perform private.pilot_require_manager(); enabled:=(prior.result_value#>>'{}')::boolean; revision:=prior.result_revision; return next; return;
 end if;
 if p_key='availability' then select a.enabled,a.revision into old_value,old_revision from private.pilot_availability a where singleton;
 else select c.enabled,c.revision into old_value,old_revision from private.pilot_capabilities c where key=p_key; end if;
 if old_revision is null or old_revision<>p_expected_revision then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 perform private.pilot_require_manager(); enabled:=p_enabled; revision:=old_revision+case when old_value=p_enabled then 0 else 1 end;
 if old_value<>p_enabled then
  if p_key='availability' then update private.pilot_availability set enabled=p_enabled,revision=set_pilot_policy.revision,updated_at=clock_timestamp() where singleton;
  else update private.pilot_capabilities set enabled=p_enabled,revision=set_pilot_policy.revision,updated_at=clock_timestamp() where key=p_key; end if;
 end if;
 insert into private.pilot_management_audit(actor_id,operation,policy_key,previous_value,new_value,previous_revision,new_revision,reason,request_id)
 values(actor,'policy',p_key,to_jsonb(old_value),to_jsonb(p_enabled),old_revision,revision,reason,p_request_id) returning id into saved_audit;
 insert into private.pilot_management_requests values(actor,p_request_id,fingerprint,to_jsonb(p_enabled),revision,saved_audit); return next;
end; $$;
-- Fixture-only trusted path. Original SQL role survives SECURITY DEFINER;
-- current_user/current_role alone would incorrectly identify the function owner.
create function private.set_pilot_manager_fixture(p_account_id uuid,p_state text,p_expected_revision bigint,p_reason text,p_request_id uuid)
returns bigint language plpgsql volatile security definer set search_path='' as $$
declare original_role text:=current_setting('role',true); reason text:=private.profile_trim(p_reason); old private.pilot_admission_managers%rowtype; next_revision bigint;
begin
 if session_user<>'postgres' or original_role not in ('none','postgres') then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 perform private.pilot_lock_management(null,p_account_id,null,true);
 if p_account_id is null or p_state is null or p_state not in ('active','revoked') or p_expected_revision is null or p_expected_revision<0
  or reason is null or char_length(reason) not between 1 and 2000 or p_request_id is null
  or not exists(select 1 from public.accounts where id=p_account_id) then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 select * into old from private.pilot_admission_managers where account_id=p_account_id;
 if coalesce(old.revision,0)<>p_expected_revision then raise exception 'Pilot management unavailable' using errcode='42501'; end if;
 next_revision:=case when old.state=p_state then old.revision else coalesce(old.revision,0)+1 end;
 if old.account_id is null then insert into private.pilot_admission_managers(account_id,state,revision) values(p_account_id,p_state,next_revision);
 elsif old.state<>p_state then update private.pilot_admission_managers set state=p_state,revision=next_revision,updated_at=clock_timestamp() where account_id=p_account_id; end if;
 insert into private.pilot_manager_audit(account_id,executor_session_user,executor_original_role,executor_backend_pid,previous_state,new_state,previous_revision,new_revision,reason,request_id)
 values(p_account_id,session_user,original_role,pg_backend_pid(),old.state,p_state,coalesce(old.revision,0),next_revision,reason,p_request_id);
 return next_revision;
end; $$;
revoke all on function private.pilot_evidence_lock(),private.pilot_evidence_write_lock(),private.pilot_lock_management(uuid,uuid,text,boolean),private.pilot_require_manager(),private.pilot_require_activation(uuid),private.reject_pilot_evidence_change(),private.set_pilot_manager_fixture(uuid,text,bigint,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.set_pilot_account_admission(uuid,text,bigint,text,uuid),public.set_pilot_policy(text,boolean,bigint,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.set_pilot_account_admission(uuid,text,bigint,text,uuid),public.set_pilot_policy(text,boolean,bigint,text,uuid) to authenticated;
commit;

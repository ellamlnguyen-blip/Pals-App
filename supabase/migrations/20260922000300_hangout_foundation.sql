-- Accepted ADR-0010: local campus-only Hangout backend, without application flows.
begin;
create table public.hangouts (
 id uuid primary key default gen_random_uuid(),
 university_id uuid not null references public.universities(id),
 host_id uuid not null references public.accounts(id),
 title text not null check(title=private.profile_trim(title) and length(title) between 1 and 120),
 description text check(description is null or (description=private.profile_trim(description) and length(description) between 1 and 2000)),
 starts_at timestamptz not null check(isfinite(starts_at)),
 ends_at timestamptz check(isfinite(ends_at) and ends_at>starts_at and ends_at<=starts_at+interval '7 days'),
 status text not null default 'published' check(status in ('published','cancelled')),
 joining_state text not null default 'open' check(joining_state in ('open','closed')),
 visibility text not null default 'campus' check(visibility='campus'),
 public_place text not null check(public_place=private.profile_trim(public_place) and length(public_place) between 1 and 120),
 public_latitude double precision not null check(public_latitude between -90 and 90),
 public_longitude double precision not null check(public_longitude between -180 and 180),
 campus_zone text check(campus_zone is null or (campus_zone=private.profile_trim(campus_zone) and length(campus_zone) between 1 and 80)),
 location_precision text not null default 'approximate_area' check(location_precision='approximate_area'),
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check(status<>'cancelled' or joining_state='closed')
);
-- This privileged switch is intentionally false after every fresh migration.
create table private.hangout_feature_gate (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into private.hangout_feature_gate(singleton,enabled) values(true,false);
revoke all on private.hangout_feature_gate from public,anon,authenticated;
create table private.hangout_create_requests (
 host_id uuid not null references public.accounts(id),
 request_id uuid not null,
 hangout_id uuid not null unique references public.hangouts(id),
 payload_fingerprint text not null,
 primary key(host_id,request_id)
);
revoke all on private.hangout_create_requests from public,anon,authenticated;
create index hangouts_university_idx on public.hangouts(university_id);
create table public.hangout_participants (
 hangout_id uuid not null references public.hangouts(id) on delete cascade,
 account_id uuid not null references public.accounts(id),
 state text not null check(state in ('joined','left','removed')),
 joined_at timestamptz not null default clock_timestamp(),
 left_at timestamptz,
 removed_at timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 primary key(hangout_id,account_id),
 check((state='joined' and left_at is null and removed_at is null)
    or (state='left' and left_at is not null and removed_at is null)
    or (state='removed' and removed_at is not null))
);
create index hangout_participants_account_idx on public.hangout_participants(account_id);
create table public.hangout_private_locations (
 hangout_id uuid primary key references public.hangouts(id) on delete cascade,
 instructions text not null check(instructions=private.profile_trim(instructions) and length(instructions) between 1 and 2000),
 updated_at timestamptz not null default clock_timestamp()
);

-- Invariants remain database constraints as well as RPC rules. Deferred host
-- checking permits atomic creation of the Hangout and its joined host row.
create function private.enforce_hangout_ownership() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.host_id is distinct from old.host_id or new.university_id is distinct from old.university_id
 or (old.status='cancelled' and (new.status<>'cancelled' or new is distinct from old))
 or (new.revision<>old.revision+1 and new is distinct from old) then
   raise exception 'Immutable Hangout ownership or lifecycle' using errcode='23514';
 end if;
 return new;
end;
$$;
create trigger hangout_ownership before update on public.hangouts for each row execute function private.enforce_hangout_ownership();
create function private.enforce_joined_host() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if tg_table_name='hangouts' then target=new.id;
 elsif tg_op='DELETE' then target=old.hangout_id;
 else target=new.hangout_id; end if;
 if exists(select 1 from public.hangouts h where h.id=target and not exists(
    select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=h.host_id and p.state='joined')) then
   raise exception 'Hangout host must remain joined' using errcode='23514';
 end if;
 return null;
end;
$$;
create constraint trigger hangout_joined_host after insert or update on public.hangouts
 deferrable initially deferred for each row execute function private.enforce_joined_host();
create constraint trigger participant_joined_host after insert or update or delete on public.hangout_participants
 deferrable initially deferred for each row execute function private.enforce_joined_host();
create function private.enforce_participant_transition() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
   if new.hangout_id<>old.hangout_id or new.account_id<>old.account_id
      or (old.state='removed' and new.state<>'removed') then
     raise exception 'Invalid participant transition' using errcode='23514';
   end if;
 end if;
 if new.state='joined' and not exists(select 1 from public.hangouts h join public.university_memberships m on m.university_id=h.university_id where h.id=new.hangout_id and m.user_id=new.account_id) then
   raise exception 'Participant campus mismatch' using errcode='23514';
 end if;
 return new;
end;
$$;
create trigger participant_transition before insert or update on public.hangout_participants
 for each row execute function private.enforce_participant_transition();
revoke all on function private.enforce_hangout_ownership(),private.enforce_joined_host(),private.enforce_participant_transition() from public,anon,authenticated;

-- Caller-bound: no arbitrary subject, claim-based campus or operator bypass.
create function private.hangouts_enabled() returns boolean
language sql stable security definer set search_path='' as $$
 select current_setting('transaction_isolation')='read committed'
   and exists(select 1 from private.hangout_feature_gate where singleton and enabled);
$$;
-- Internal subject check: this helper is never exposed to client roles. It
-- mirrors live readiness for roster filtering without a subject oracle.
create function private.ready_subject_campus(subject uuid, campus uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.accounts a
 join auth.users u on u.id=a.id
 join public.university_memberships m on m.user_id=a.id
 join public.universities c on c.id=m.university_id
 join public.profiles p on p.user_id=a.id
 join storage.objects o on o.bucket_id='profile-photos' and o.name=p.primary_photo_path and o.owner_id=a.id::text
 where a.id=subject and a.status='active' and c.id=campus and c.active
 and u.email_confirmed_at is not null and m.verified_at is not null
 and lower(u.email)=lower(m.verification_email)
 and u.email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
 and lower(split_part(u.email,'@',2))=any(c.allowed_email_domains)
 and p.is_complete);
$$;
revoke all on function private.hangouts_enabled(),private.ready_subject_campus(uuid,uuid) from public,anon,authenticated;
create function private.ready_campus() returns uuid
language sql stable security definer set search_path='' as $$
 select university_id from public.university_memberships
 where user_id=(select auth.uid()) and private.hangouts_enabled() and public.get_access_state()='ready';
$$;
create function private.can_read_hangout(target uuid, private_details boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hangouts h
 where h.id=target and h.university_id=private.ready_campus() and h.visibility='campus'
 and (case when private_details then h.status='published' and
       (h.host_id=(select auth.uid()) or exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=(select auth.uid()) and p.state='joined'))
   else h.status='published' or (h.status='cancelled' and
       (h.host_id=(select auth.uid()) or exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=(select auth.uid()) and p.state='joined'))) end));
$$;
create function private.can_read_hangout_roster(target uuid, subject uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hangouts h
 join public.hangout_participants p on p.hangout_id=h.id
 where h.id=target and h.status='published' and p.account_id=subject
 and p.state='joined' and private.can_read_hangout(target)
 and private.ready_subject_campus(subject,h.university_id));
$$;
revoke all on function private.ready_campus(),private.can_read_hangout(uuid,boolean) from public,anon,authenticated;
revoke all on function private.can_read_hangout_roster(uuid,uuid) from public,anon,authenticated;
grant execute on function private.ready_campus(),private.can_read_hangout(uuid,boolean),private.can_read_hangout_roster(uuid,uuid) to authenticated;
alter table public.hangouts enable row level security;
alter table public.hangout_participants enable row level security;
alter table public.hangout_private_locations enable row level security;
revoke all on public.hangouts,public.hangout_participants,public.hangout_private_locations from public,anon,authenticated;
grant select on public.hangouts,public.hangout_private_locations to authenticated;
-- Historical state/timestamps are not part of the campus roster API.
grant select(hangout_id,account_id) on public.hangout_participants to authenticated;
create policy hangouts_read on public.hangouts for select to authenticated using(private.can_read_hangout(id));
create policy hangout_roster_read on public.hangout_participants for select to authenticated using(private.can_read_hangout_roster(hangout_id,account_id));
create policy hangout_private_read on public.hangout_private_locations for select to authenticated using(private.can_read_hangout(hangout_id,true));

-- All transitions own the same row lock. A physical parent tuple update also
-- makes stronger-isolation snapshots abort, even when only a child row changes.
-- This helper is internal and never directly executable by clients.
create function private.lock_hangout(target uuid) returns public.hangouts
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
 select * into h from public.hangouts where id=target for update;
 if not found or h.university_id is distinct from private.ready_campus() then
   raise exception 'Hangout operation not permitted' using errcode='42501';
 end if;
 update public.hangouts set updated_at=updated_at where id=target;
 return h;
end;
$$;
create function private.validate_hangout_input(p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text,p_ends_at timestamptz,p_campus_zone text,p_visibility text,p_location_precision text,p_eligibility jsonb) returns void
language plpgsql stable set search_path='' as $$
begin
 if p_title is null or length(private.profile_trim(p_title)) not between 1 and 120
 or p_starts_at is null or not isfinite(p_starts_at)
 or (p_ends_at is not null and (not isfinite(p_ends_at) or p_ends_at<=p_starts_at or p_ends_at>p_starts_at+interval '7 days'))
 or p_public_place is null or length(private.profile_trim(p_public_place)) not between 1 and 120
 or p_public_latitude is null or not(p_public_latitude between -90 and 90)
 or p_public_longitude is null or not(p_public_longitude between -180 and 180)
 or length(private.profile_trim(p_description))>2000 or length(private.profile_trim(p_campus_zone))>80
 or p_visibility is distinct from 'campus' or p_location_precision is distinct from 'approximate_area' or p_eligibility is not null then
   raise exception 'Invalid Hangout input' using errcode='22023';
 end if;
end;
$$;
create function private.validate_hangout_instructions(value text) returns void
language plpgsql stable set search_path='' as $$
begin
 if length(private.profile_trim(value))>2000 then
   raise exception 'Invalid private meeting instructions' using errcode='22023';
 end if;
end;
$$;
revoke all on function private.lock_hangout(uuid),private.validate_hangout_input(text,timestamptz,text,double precision,double precision,text,timestamptz,text,text,text,jsonb),private.validate_hangout_instructions(text) from public,anon,authenticated;

create function public.create_hangout(p_request_id uuid,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare campus uuid; result uuid; existing_id uuid; existing_fingerprint text; fingerprint text; normalized_private text;
begin
 campus=private.ready_campus();
 if campus is null then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.validate_hangout_input(p_title,p_starts_at,p_public_place,p_public_latitude,p_public_longitude,p_description,p_ends_at,p_campus_zone,p_visibility,p_location_precision,p_eligibility);
 perform private.validate_hangout_instructions(p_private_instructions);
 if p_request_id is null then raise exception 'Invalid Hangout input' using errcode='22023'; end if;
 normalized_private=nullif(private.profile_trim(p_private_instructions),'');
 fingerprint=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_array(private.profile_trim(p_title),extract(epoch from p_starts_at),
   private.profile_trim(p_public_place),p_public_latitude,p_public_longitude,
   nullif(private.profile_trim(p_description),''),extract(epoch from p_ends_at),
   nullif(private.profile_trim(p_campus_zone),''),normalized_private,
   p_visibility,p_location_precision,p_eligibility)::text,'UTF8')),'hex');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_request_id::text,0));
 if private.ready_campus() is distinct from campus then
   raise exception 'Hangout operation not permitted' using errcode='42501';
 end if;
 select r.hangout_id,r.payload_fingerprint into existing_id,existing_fingerprint
 from private.hangout_create_requests r where r.host_id=auth.uid() and r.request_id=p_request_id;
 if found then
   -- The current gate/readiness/campus and row access must still hold. Never
   -- replay private content, even when the original write had it.
   if not private.can_read_hangout(existing_id) then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
   if existing_fingerprint<>fingerprint then raise exception 'Creation request conflict' using errcode='23505'; end if;
   return existing_id;
 end if;
 if p_starts_at<clock_timestamp() or p_starts_at>clock_timestamp()+interval '366 days' then
   raise exception 'Invalid Hangout input' using errcode='22023';
 end if;
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
create function private.check_hangout_revision(h public.hangouts, expected bigint) returns void
language plpgsql set search_path='' as $$
begin
 if expected is null or expected<>h.revision then raise exception 'Stale Hangout revision' using errcode='40001'; end if;
end;
$$;
revoke all on function private.check_hangout_revision(public.hangouts,bigint) from public,anon,authenticated;
create function public.edit_hangout(p_hangout_id uuid,p_expected_revision bigint,p_title text,p_starts_at timestamptz,p_public_place text,p_public_latitude double precision,p_public_longitude double precision,p_description text default null,p_ends_at timestamptz default null,p_campus_zone text default null,p_private_instructions text default null,p_visibility text default 'campus',p_location_precision text default 'approximate_area',p_eligibility jsonb default null) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint; normalized_private text;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 perform private.validate_hangout_input(p_title,p_starts_at,p_public_place,p_public_latitude,p_public_longitude,p_description,p_ends_at,p_campus_zone,p_visibility,p_location_precision,p_eligibility);
 perform private.validate_hangout_instructions(p_private_instructions);
 if p_starts_at is distinct from h.starts_at and (p_starts_at<clock_timestamp() or p_starts_at>clock_timestamp()+interval '366 days') then
   raise exception 'Invalid Hangout input' using errcode='22023';
 end if;
 normalized_private=nullif(private.profile_trim(p_private_instructions),'');
 update public.hangouts set title=private.profile_trim(p_title),starts_at=p_starts_at,public_place=private.profile_trim(p_public_place),public_latitude=p_public_latitude,public_longitude=p_public_longitude,description=nullif(private.profile_trim(p_description),''),ends_at=p_ends_at,campus_zone=nullif(private.profile_trim(p_campus_zone),''),revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 if normalized_private is null then
   delete from public.hangout_private_locations where hangout_id=h.id;
 else
   insert into public.hangout_private_locations(hangout_id,instructions) values(h.id,normalized_private)
   on conflict(hangout_id) do update set instructions=excluded.instructions,updated_at=clock_timestamp();
 end if;
 return next_revision;
end;
$$;
create function public.set_hangout_joining(p_hangout_id uuid,p_expected_revision bigint,p_joining_state text) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 if p_joining_state is null or p_joining_state not in ('open','closed') then raise exception 'Invalid joining state' using errcode='22023'; end if;
 update public.hangouts set joining_state=p_joining_state,revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 return next_revision;
end;
$$;
create function public.cancel_hangout(p_hangout_id uuid,p_expected_revision bigint) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; next_revision bigint;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or h.status<>'published' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1,updated_at=clock_timestamp() where id=h.id returning revision into next_revision;
 return next_revision;
end;
$$;
create function public.get_hangout_participant_state(p_hangout_id uuid,p_account_id uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare h public.hangouts;
begin
 if private.ready_campus() is null then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select * into h from public.hangouts where id=p_hangout_id;
 if not found or not private.can_read_hangout(h.id) or
    (h.host_id<>auth.uid() and
      (p_account_id<>auth.uid() or not exists(
        select 1 from public.hangout_participants p
        where p.hangout_id=h.id and p.account_id=auth.uid()))) then
   raise exception 'Hangout operation not permitted' using errcode='42501';
 end if;
 return (select state from public.hangout_participants where hangout_id=h.id and account_id=p_account_id);
end;
$$;
create function public.join_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts; participant_state text;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.status<>'published' or h.joining_state<>'open' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 select state into participant_state from public.hangout_participants where hangout_id=h.id and account_id=auth.uid();
 if participant_state='removed' then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 if participant_state='joined' then return; end if;
 insert into public.hangout_participants(hangout_id,account_id,state) values(h.id,auth.uid(),'joined')
 on conflict(hangout_id,account_id) do update set state='joined',joined_at=clock_timestamp(),left_at=null,updated_at=clock_timestamp()
 where hangout_participants.state='left';
end;
$$;
create function public.leave_hangout(p_hangout_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id=auth.uid() then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 update public.hangout_participants set state='left',left_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=h.id and account_id=auth.uid() and state='joined';
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
end;
$$;
create function public.remove_hangout_participant(p_hangout_id uuid,p_account_id uuid) returns void
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
 h=private.lock_hangout(p_hangout_id);
 if h.host_id<>auth.uid() or p_account_id is null or p_account_id=h.host_id then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
 update public.hangout_participants set state='removed',removed_at=clock_timestamp(),updated_at=clock_timestamp()
 where hangout_id=h.id and account_id=p_account_id and state in ('joined','left');
 if not found then raise exception 'Hangout operation not permitted' using errcode='42501'; end if;
end;
$$;
revoke all on function public.create_hangout(uuid,text,timestamptz,text,double precision,double precision,text,timestamptz,text,text,text,text,jsonb),public.edit_hangout(uuid,bigint,text,timestamptz,text,double precision,double precision,text,timestamptz,text,text,text,text,jsonb),public.set_hangout_joining(uuid,bigint,text),public.cancel_hangout(uuid,bigint),public.get_hangout_participant_state(uuid,uuid),public.join_hangout(uuid),public.leave_hangout(uuid),public.remove_hangout_participant(uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_hangout(uuid,text,timestamptz,text,double precision,double precision,text,timestamptz,text,text,text,text,jsonb),public.edit_hangout(uuid,bigint,text,timestamptz,text,double precision,double precision,text,timestamptz,text,text,text,text,jsonb),public.set_hangout_joining(uuid,bigint,text),public.cancel_hangout(uuid,bigint),public.get_hangout_participant_state(uuid,uuid),public.join_hangout(uuid),public.leave_hangout(uuid),public.remove_hangout_participant(uuid,uuid) to authenticated;
commit;

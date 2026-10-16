-- TASK-033C: private conversation polls, accepted ADR-0042. Disposable-local only.
begin;
create table private.chat_polls (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('hangout','dm')),
 source_id uuid not null,
 creator_id uuid not null references public.accounts(id),
 question text not null check (question=private.profile_trim(question) and length(question) between 1 and 200),
 created_at timestamptz not null default clock_timestamp(),
 closed_at timestamptz,
 unique(id,kind,source_id)
);
create index chat_polls_page on private.chat_polls(kind,source_id,created_at desc,id desc);
create index chat_polls_rate on private.chat_polls(kind,source_id,creator_id,created_at desc);
create table private.chat_poll_options (
 id uuid primary key default gen_random_uuid(),
 poll_id uuid not null references private.chat_polls(id),
 ordinal smallint not null check (ordinal between 1 and 6),
 label text not null check (label=private.profile_trim(label) and length(label) between 1 and 100),
 unique(poll_id,ordinal), unique(poll_id,id), unique(poll_id,label)
);
create table private.chat_poll_votes (
 poll_id uuid not null references private.chat_polls(id),
 voter_id uuid not null references public.accounts(id),
 option_id uuid not null,
 changed_at timestamptz not null default clock_timestamp(),
 primary key(poll_id,voter_id),
 foreign key(poll_id,option_id) references private.chat_poll_options(poll_id,id)
);
create table private.chat_poll_retries (
 actor_id uuid not null references public.accounts(id),
 request_id uuid not null,
 action text not null check (action in ('create','vote','close')),
 kind text not null check (kind in ('hangout','dm')),
 source_id uuid not null,
 poll_id uuid not null references private.chat_polls(id),
 option_id uuid,
 fingerprint text not null,
 primary key(actor_id,request_id)
);
alter table private.chat_polls enable row level security;
alter table private.chat_poll_options enable row level security;
alter table private.chat_poll_votes enable row level security;
alter table private.chat_poll_retries enable row level security;
revoke all on private.chat_polls,private.chat_poll_options,private.chat_poll_votes,private.chat_poll_retries from public,anon,authenticated,service_role;

-- Lock order follows existing source writers; callers cannot select a different actor.
create function private.chat_poll_lock_source(p_kind text,p_source_id uuid,p_peer_id uuid)
returns void language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); h public.hangouts; pair private.dm_pairs%rowtype;
begin
 if current_setting('transaction_isolation') <> 'read committed' or actor is null or p_source_id is null
    or p_kind not in ('hangout','dm') or p_kind is null then
  raise exception 'Poll unavailable' using errcode='42501'; end if;
 if p_kind='hangout' then
  if p_peer_id is not null then raise exception 'Poll unavailable' using errcode='42501'; end if;
  perform 1 from private.pilot_lock_cohost_chat('send_hangout_message',p_source_id,null);
  perform private.pilot_require_cohost_chat('send_hangout_message',p_source_id,null);
  perform private.chat_require(p_source_id);
 else
  if p_peer_id is null or p_peer_id=actor then raise exception 'Poll unavailable' using errcode='42501'; end if;
  perform private.social_hangout_mutation_lock();
  perform private.people_require_read_committed();
  perform private.friendship_lock_pair(actor,p_peer_id);
  perform private.dm_lock_evidence(actor,p_peer_id);
  perform 1 from private.friendship_feature_gate where singleton for share;
  select * into pair from private.dm_pairs d where d.generation_id=p_source_id
   and d.low_id=least(actor,p_peer_id) and d.high_id=greatest(actor,p_peer_id)
   and d.state='accepted' for update;
  if not found or not private.dm_eligible(p_peer_id)
    or not private.dm_current_consent(p_source_id,actor,p_peer_id) then
   raise exception 'Poll unavailable' using errcode='42501'; end if;
 end if;
end; $$;
revoke all on function private.chat_poll_lock_source(text,uuid,uuid) from public,anon,authenticated,service_role;

-- Statement-scoped projection guard. A read started before revocation can finish;
-- subsequent reads fail. No raw row grant is needed.
create function private.chat_poll_can_read(p_kind text,p_source_id uuid,p_peer_id uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select current_setting('transaction_isolation')='read committed' and auth.uid() is not null
  and p_source_id is not null and
  case when p_kind='hangout' then p_peer_id is null and private.chat_authorized(p_source_id)
   when p_kind='dm' then p_peer_id is not null and p_peer_id<>auth.uid()
     and private.dm_eligible(p_peer_id)
     and private.dm_current_consent(p_source_id,auth.uid(),p_peer_id)
   else false end;
$$;
revoke all on function private.chat_poll_can_read(text,uuid,uuid) from public,anon,authenticated,service_role;

create function public.create_chat_poll(p_kind text,p_source_id uuid,p_peer_id uuid,
 p_request_id uuid,p_question text,p_options text[]) returns uuid
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); q text; opts text[]; opt text; i integer;
 fp text; old private.chat_poll_retries%rowtype; made uuid;
begin
 perform private.chat_poll_lock_source(p_kind,p_source_id,p_peer_id);
 if p_request_id is null or p_question is null or p_options is null
   or pg_catalog.array_ndims(p_options) is distinct from 1
   or pg_catalog.cardinality(p_options) not between 2 and 6 then
  raise exception 'Invalid poll' using errcode='22023'; end if;
 q:=private.profile_trim(p_question);
 if length(q) not between 1 and 200 or q ~ '[[:cntrl:]]' then
  raise exception 'Invalid poll' using errcode='22023'; end if;
 opts:=array(select private.profile_trim(x) from unnest(p_options) x);
 if exists(select 1 from unnest(opts) x where x is null or length(x) not between 1 and 100
    or x ~ '[[:cntrl:]]')
  or (select count(distinct x) from unnest(opts) x)<>array_length(opts,1) then
  raise exception 'Invalid poll' using errcode='22023'; end if;
 fp:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.jsonb_build_array(p_kind,p_source_id,q,opts)::text,'UTF8')),'hex');
 select * into old from private.chat_poll_retries r where r.actor_id=actor and r.request_id=p_request_id;
 if found then
  if old.action<>'create' or old.kind<>p_kind or old.source_id<>p_source_id or old.fingerprint<>fp then
   raise exception 'Poll request conflict' using errcode='23505'; end if;
  return old.poll_id;
 end if;
 if (select count(*) from private.chat_polls p where p.kind=p_kind and p.source_id=p_source_id
     and p.creator_id=actor and p.created_at>clock_timestamp()-interval '1 hour')>=5 then
  raise exception 'Poll rate limit' using errcode='22023'; end if;
 if p_kind='hangout' then
  insert into private.hangout_conversations(hangout_id) values(p_source_id)
   on conflict(hangout_id) do nothing;
 end if;
 insert into private.chat_polls(kind,source_id,creator_id,question)
  values(p_kind,p_source_id,actor,q) returning id into made;
 for i in 1..array_length(opts,1) loop
  insert into private.chat_poll_options(poll_id,ordinal,label) values(made,i,opts[i]);
 end loop;
 insert into private.chat_poll_retries(actor_id,request_id,action,kind,source_id,poll_id,fingerprint)
  values(actor,p_request_id,'create',p_kind,p_source_id,made,fp);
 return made;
end; $$;

create function public.vote_chat_poll(p_kind text,p_source_id uuid,p_peer_id uuid,
 p_poll_id uuid,p_option_id uuid,p_request_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); poll private.chat_polls%rowtype; old private.chat_poll_retries%rowtype;
 fp text; current_option uuid;
begin
 perform private.chat_poll_lock_source(p_kind,p_source_id,p_peer_id);
 if p_poll_id is null or p_option_id is null or p_request_id is null then
  raise exception 'Invalid vote' using errcode='22023'; end if;
 select * into poll from private.chat_polls p where p.id=p_poll_id and p.kind=p_kind
  and p.source_id=p_source_id for update;
 if not found then raise exception 'Poll unavailable' using errcode='42501'; end if;
 fp:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.jsonb_build_array(p_kind,p_source_id,p_poll_id,p_option_id)::text,'UTF8')),'hex');
 select * into old from private.chat_poll_retries r where r.actor_id=actor and r.request_id=p_request_id;
 if found and (old.action<>'vote' or old.kind<>p_kind or old.source_id<>p_source_id
    or old.poll_id<>p_poll_id or old.option_id<>p_option_id or old.fingerprint<>fp) then
  raise exception 'Poll request conflict' using errcode='23505'; end if;
 if poll.closed_at is not null then raise exception 'Poll closed' using errcode='42501'; end if;
 if not exists(select 1 from private.chat_poll_options o where o.poll_id=p_poll_id and o.id=p_option_id) then
  raise exception 'Invalid option' using errcode='22023'; end if;
 select v.option_id into current_option from private.chat_poll_votes v
   where v.poll_id=p_poll_id and v.voter_id=actor;
 if found then
  if old.request_id is not null then
   return pg_catalog.jsonb_build_object('poll_id',p_poll_id,'option_id',current_option,'applied',false);
  end if;
  if current_option<>p_option_id then
   update private.chat_poll_votes v set option_id=p_option_id,changed_at=clock_timestamp()
    where v.poll_id=p_poll_id and v.voter_id=actor;
  end if;
 else
  if old.request_id is not null then
   return pg_catalog.jsonb_build_object('poll_id',p_poll_id,'option_id',null,'applied',false);
  end if;
  insert into private.chat_poll_votes(poll_id,voter_id,option_id) values(p_poll_id,actor,p_option_id);
 end if;
 insert into private.chat_poll_retries(actor_id,request_id,action,kind,source_id,poll_id,option_id,fingerprint)
  values(actor,p_request_id,'vote',p_kind,p_source_id,p_poll_id,p_option_id,fp);
 return pg_catalog.jsonb_build_object('poll_id',p_poll_id,'option_id',p_option_id,'applied',true);
end; $$;

create function public.close_chat_poll(p_kind text,p_source_id uuid,p_peer_id uuid,
 p_poll_id uuid,p_request_id uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); poll private.chat_polls%rowtype; old private.chat_poll_retries%rowtype; fp text;
begin
 perform private.chat_poll_lock_source(p_kind,p_source_id,p_peer_id);
 if p_poll_id is null or p_request_id is null then raise exception 'Invalid close' using errcode='22023'; end if;
 select * into poll from private.chat_polls p where p.id=p_poll_id and p.kind=p_kind
  and p.source_id=p_source_id for update;
 if not found or poll.creator_id<>actor then raise exception 'Poll unavailable' using errcode='42501'; end if;
 fp:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
  pg_catalog.jsonb_build_array(p_kind,p_source_id,p_poll_id)::text,'UTF8')),'hex');
 select * into old from private.chat_poll_retries r where r.actor_id=actor and r.request_id=p_request_id;
 if found then
  if old.action<>'close' or old.kind<>p_kind or old.source_id<>p_source_id
    or old.poll_id<>p_poll_id or old.fingerprint<>fp then
   raise exception 'Poll request conflict' using errcode='23505'; end if;
  return pg_catalog.jsonb_build_object('poll_id',p_poll_id,'closed_at',poll.closed_at);
 end if;
 if poll.closed_at is null then
  update private.chat_polls p set closed_at=clock_timestamp() where p.id=p_poll_id returning * into poll;
 end if;
 insert into private.chat_poll_retries(actor_id,request_id,action,kind,source_id,poll_id,fingerprint)
  values(actor,p_request_id,'close',p_kind,p_source_id,p_poll_id,fp);
 return pg_catalog.jsonb_build_object('poll_id',p_poll_id,'closed_at',poll.closed_at);
end; $$;

create function public.list_chat_polls(p_kind text,p_source_id uuid,p_peer_id uuid,
 p_before_created_at timestamptz default null,p_before_poll_id uuid default null,p_limit integer default 24)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare answer jsonb;
begin
 if p_limit is null or p_limit not between 1 and 24 or
  ((p_before_created_at is null)<>(p_before_poll_id is null)) then
  raise exception 'Invalid poll page' using errcode='22023'; end if;
 -- The materialized guard and projection are one statement. No voter ID leaves it.
 with guard as materialized (select private.chat_poll_can_read(p_kind,p_source_id,p_peer_id) ok),
 page as materialized (
  select p.* from guard g join private.chat_polls p on g.ok and p.kind=p_kind
   and p.source_id=p_source_id
   where p_before_created_at is null or (p.created_at,p.id)<(p_before_created_at,p_before_poll_id)
   order by p.created_at desc,p.id desc limit p_limit)
 select case when (select ok from guard) then coalesce(pg_catalog.jsonb_agg(item order by created_at desc,id desc),'[]'::jsonb)
  else null end into answer
 from (select p.id,p.created_at,
  pg_catalog.jsonb_build_object('poll_id',p.id,'question',p.question,
   'created_at',p.created_at,'closed_at',p.closed_at,
   'creator_id',case when p.kind='dm' then p.creator_id
    when private.ready_subject_campus(p.creator_id,h.university_id)
      and exists(select 1 from public.hangout_participants part where part.hangout_id=p.source_id
       and part.account_id=p.creator_id and part.state='joined')
    then p.creator_id else null end,
   'my_option_id',(select v.option_id from private.chat_poll_votes v where v.poll_id=p.id and v.voter_id=auth.uid()),
   'options',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',o.id,'label',o.label,
      'ordinal',o.ordinal,'votes',(
       select count(*) from private.chat_poll_votes v where v.poll_id=p.id and v.option_id=o.id
       and (p.kind='dm' or (private.ready_subject_campus(v.voter_id,h.university_id)
        and exists(select 1 from public.hangout_participants part where part.hangout_id=p.source_id
         and part.account_id=v.voter_id and part.state='joined')
        and not private.safety_pair_blocked(v.voter_id,h.host_id))))) order by o.ordinal)
     from private.chat_poll_options o where o.poll_id=p.id)) item
  from page p left join public.hangouts h on p.kind='hangout' and h.id=p.source_id) projected;
 if answer is null then raise exception 'Poll unavailable' using errcode='42501'; end if;
 return answer;
end; $$;
revoke all on function public.create_chat_poll(text,uuid,uuid,uuid,text,text[]),
 public.vote_chat_poll(text,uuid,uuid,uuid,uuid,uuid),
 public.close_chat_poll(text,uuid,uuid,uuid,uuid),
 public.list_chat_polls(text,uuid,uuid,timestamptz,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.create_chat_poll(text,uuid,uuid,uuid,text,text[]),
 public.vote_chat_poll(text,uuid,uuid,uuid,uuid,uuid),
 public.close_chat_poll(text,uuid,uuid,uuid,uuid),
 public.list_chat_polls(text,uuid,uuid,timestamptz,uuid,integer) to authenticated;
commit;

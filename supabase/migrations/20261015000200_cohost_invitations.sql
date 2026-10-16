-- TASK-033E / Accepted ADR-0042. Private, consent-bound co-host invitations.
begin;

-- The old direct assignment function remains for historical object identity but
-- no student role can execute it. No overload is left callable by authenticated.
do $$ declare signature regprocedure; begin
 for signature in select p.oid::regprocedure from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='promote_hangout_cohost' loop
  execute format('revoke all on function %s from public, anon, authenticated, service_role',signature);
 end loop;
end $$;

create table private.cohost_invitations (
 id uuid primary key default gen_random_uuid(),
 hangout_id uuid not null references public.hangouts(id) on delete restrict,
 host_id uuid not null references public.accounts(id) on delete restrict,
 recipient_id uuid not null references public.accounts(id) on delete restrict,
 request_id uuid not null,
 state text not null default 'pending' check(state in('pending','accepted','declined','withdrawn','unavailable')),
 created_at timestamptz not null default clock_timestamp(),
 responded_at timestamptz,
 check(host_id<>recipient_id),
 check((state='pending')=(responded_at is null)),
 unique(host_id,request_id)
);
create unique index cohost_invitations_one_pending on private.cohost_invitations(hangout_id,recipient_id) where state='pending';
create index cohost_invitations_target_page on private.cohost_invitations(recipient_id,created_at desc,id desc);
alter table private.cohost_invitations enable row level security;
revoke all on private.cohost_invitations from public,anon,authenticated,service_role;

-- Source transitions hold the shared social lock and Hangout parent before
-- participant/evidence writes. These triggers make a prior pending invite terminal.
create function private.cohost_invitation_departure() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.state='joined' and new.state<>'joined' then
  update private.cohost_invitations i set state='unavailable',responded_at=clock_timestamp()
   where i.hangout_id=old.hangout_id and i.recipient_id=old.account_id and i.state='pending';
 end if;
 return new;
end $$;
create trigger cohost_invitation_departure after update of state on public.hangout_participants
 for each row execute function private.cohost_invitation_departure();

create function private.cohost_invitation_cancel() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.status='published' and new.status<>'published' then
  update private.cohost_invitations i set state='unavailable',responded_at=clock_timestamp()
   where i.hangout_id=new.id and i.state='pending';
 end if;
 return new;
end $$;
create trigger cohost_invitation_cancel after update of status on public.hangouts
 for each row execute function private.cohost_invitation_cancel();

create function private.cohost_invitation_disabled() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update private.cohost_invitations i set state='unavailable',responded_at=clock_timestamp()
  where i.hangout_id=new.hangout_id and i.state='pending';
 return new;
end $$;
create trigger cohost_invitation_disabled after insert on private.hangout_disables
 for each row execute function private.cohost_invitation_disabled();

-- A block directly terminates any still-pending invite between the pair,
-- including retained invitations whose attendance was already lost.
create function private.cohost_invitation_blocked() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update private.cohost_invitations i set state='unavailable',responded_at=clock_timestamp()
  where i.state='pending' and ((i.host_id=new.blocker_id and i.recipient_id=new.blocked_id)
   or (i.host_id=new.blocked_id and i.recipient_id=new.blocker_id));
 return new;
end $$;
create trigger cohost_invitation_blocked after insert on private.people_blocks
 for each row execute function private.cohost_invitation_blocked();

-- Eligibility loss is terminal. The fresh predicate also covers changed Auth
-- email confirmation and campus membership, with no copied identity data.
create function private.cohost_invitation_subject_changed() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid;
begin
 subject:=case when tg_table_schema='auth' then new.id
  when tg_table_name='university_memberships' then new.user_id else new.id end;
 update private.cohost_invitations i set state='unavailable',responded_at=clock_timestamp()
  from public.hangouts h where i.hangout_id=h.id and i.state='pending'
   and (i.host_id=subject or i.recipient_id=subject)
   and (not private.ready_subject_campus(i.host_id,h.university_id)
    or not private.ready_subject_campus(i.recipient_id,h.university_id));
 return new;
end $$;
create trigger cohost_invitation_account_changed after update of status on public.accounts
 for each row execute function private.cohost_invitation_subject_changed();
create trigger cohost_invitation_auth_changed after update of email,email_confirmed_at on auth.users
 for each row execute function private.cohost_invitation_subject_changed();
create trigger cohost_invitation_membership_changed after update of university_id,verification_email,verified_at on public.university_memberships
 for each row execute function private.cohost_invitation_subject_changed();

create function private.cohost_invitation_membership_deleted() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update private.cohost_invitations i set state='unavailable',responded_at=clock_timestamp()
  where i.state='pending' and (i.host_id=old.user_id or i.recipient_id=old.user_id);
 return old;
end $$;
create trigger cohost_invitation_membership_deleted after delete on public.university_memberships
 for each row execute function private.cohost_invitation_membership_deleted();
-- Source or capability suspension is also one-way for pending consent. Gate
-- writers serialize through their own row; any deadlock aborts one writer.
create function private.cohost_invitation_gate_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.enabled and not new.enabled then
  update private.cohost_invitations set state='unavailable',responded_at=clock_timestamp()
   where state='pending';
 end if;
 return new;
end $$;
create trigger cohost_invitation_hangout_gate after update of enabled on private.hangout_feature_gate
 for each row execute function private.cohost_invitation_gate_changed();
create trigger cohost_invitation_capability_gate after update of enabled on private.pilot_capabilities
 for each row when (new.key='hangouts') execute function private.cohost_invitation_gate_changed();
create function private.cohost_invitation_campus_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update private.cohost_invitations i set state='unavailable',responded_at=clock_timestamp()
  from public.hangouts h where i.hangout_id=h.id and h.university_id=new.id and i.state='pending'
   and (not private.ready_subject_campus(i.host_id,h.university_id)
    or not private.ready_subject_campus(i.recipient_id,h.university_id));
 return new;
end $$;
create trigger cohost_invitation_campus_changed after update of active,slug,allowed_email_domains on public.universities
 for each row execute function private.cohost_invitation_campus_changed();
create trigger cohost_invitation_pilot_availability after update of enabled on private.pilot_availability
 for each row execute function private.cohost_invitation_gate_changed();
revoke all on function private.cohost_invitation_blocked(),
 private.cohost_invitation_subject_changed(),private.cohost_invitation_gate_changed(),
 private.cohost_invitation_campus_changed(),private.cohost_invitation_membership_deleted()
 from public,anon,authenticated,service_role;

-- This is a private read predicate, never a public capability or participant
-- writer. The ledger is retained even when the predicate becomes false.
create function private.cohost_invitation_current(p_invitation uuid,p_recipient uuid)
returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from private.cohost_invitations i
  join public.hangouts h on h.id=i.hangout_id and h.host_id=i.host_id
  join public.hangout_participants p on p.hangout_id=h.id and p.account_id=i.recipient_id and p.state='joined'
  where i.id=p_invitation and i.recipient_id=p_recipient and i.state='pending'
   and h.status='published' and h.visibility='campus'
   and private.hangouts_enabled() and private.pilot_capability_enabled('hangouts')
   and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
   and private.ready_subject_campus(i.host_id,h.university_id)
   and private.ready_subject_campus(i.recipient_id,h.university_id)
   and not private.safety_pair_blocked(i.host_id,i.recipient_id)
   and not exists(select 1 from private.hangout_cohosts c where c.hangout_id=h.id and c.account_id=i.recipient_id));
$$;
revoke all on function private.cohost_invitation_current(uuid,uuid),
 private.cohost_invitation_departure(),private.cohost_invitation_cancel(),
 private.cohost_invitation_disabled() from public,anon,authenticated,service_role;

alter table private.notification_items drop constraint notification_items_event_code_check;
alter table private.notification_items add constraint notification_items_event_code_check check(event_code in
 ('friend_request','friend_accepted','dm_request','dm_accepted','dm_message',
 'hangout_edited','hangout_cancelled','hangout_joined','hangout_left','hangout_chat_message','cohost_invitation'));
alter table private.notification_items drop constraint notification_items_check;
alter table private.notification_items add constraint notification_items_check check(
 (source_kind='friendship' and event_code in('friend_request','friend_accepted') and source_id=target_id)
 or (source_kind='dm' and event_code in('dm_request','dm_accepted') and source_id=target_id)
 or (source_kind='dm' and event_code='dm_message')
 or (source_kind='hangout' and event_code in('hangout_edited','hangout_cancelled','hangout_joined','hangout_left'))
 or (source_kind='hangout_chat' and event_code='hangout_chat_message')
 or (source_kind='hangout_invitation' and event_code='cohost_invitation'));
alter table private.notification_items drop constraint notification_items_source_kind_check;
alter table private.notification_items add constraint notification_items_source_kind_check check(source_kind in
 ('friendship','dm','hangout','hangout_chat','hangout_invitation'));

create function public.invite_hangout_cohost(p_hangout_id uuid,p_account_id uuid,p_request_id uuid,p_expected_revision bigint)
returns table(invitation_id uuid,hangout_revision bigint)
language plpgsql volatile security definer set search_path='' as $$
declare evidence record; h public.hangouts; prior private.cohost_invitations; result_id uuid; next_revision bigint;
begin
 if p_request_id is null then raise exception 'Invalid invitation request' using errcode='22023'; end if;
 -- Existing promotion lock validates host and target identities, membership,
 -- readiness, source gates and block state after all lock waits.
 select * into evidence from private.pilot_lock_cohost_chat('promote_hangout_cohost',p_hangout_id,p_account_id);
 select * into h from public.hangouts where id=evidence.source_id;
 select * into prior from private.cohost_invitations i where i.host_id=auth.uid() and i.request_id=p_request_id;
 if found then
  if prior.hangout_id<>p_hangout_id or prior.recipient_id<>p_account_id then
   raise exception 'Invitation request conflict' using errcode='23505'; end if;
  if not private.cohost_invitation_current(prior.id,p_account_id) then
   raise exception 'Invitation unavailable' using errcode='42501'; end if;
  return query select prior.id,h.revision; return;
 end if;
 perform private.pilot_require_cohost_chat('promote_hangout_cohost',p_hangout_id,p_account_id);
 perform private.check_hangout_revision(h,p_expected_revision);
 if exists(select 1 from private.cohost_invitations i where i.hangout_id=h.id and i.recipient_id=p_account_id and i.state='pending') then
  raise exception 'Invitation already pending' using errcode='23505'; end if;
 insert into private.cohost_invitations(hangout_id,host_id,recipient_id,request_id)
  values(h.id,h.host_id,p_account_id,p_request_id) returning id into result_id;
 update public.hangouts set revision=revision+1,updated_at=clock_timestamp()
  where id=h.id returning revision into next_revision;
 perform 1 from private.hangout_feature_gate where singleton for share;
 if private.hangouts_enabled() then
  perform private.notification_emit(p_account_id,'hangout_invitation',result_id,h.id,
   'cohost_invitation',h.host_id,'social_requests');
 end if;
 return query select result_id,next_revision;
end $$;

-- Recipient response is serialized behind source and identity evidence. The
-- invitation row is locked after the Hangout and participant tuple.
create function public.respond_hangout_cohost_invitation(p_invitation_id uuid,p_accept boolean,p_expected_revision bigint)
returns bigint language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); i private.cohost_invitations; h public.hangouts; next_revision bigint;
begin
 perform private.social_hangout_mutation_lock();
 if actor is null or p_invitation_id is null or p_accept is null or current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 -- Match ordinary co-host writers: social, pilot evidence/availability and
 -- capability rows, then Hangout parent and lower identity/participant rows.
 perform private.pilot_evidence_lock();
 perform 1 from private.pilot_availability where singleton for share;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform 1 from private.pilot_capabilities where key='hangouts' for share;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 -- Initial lookup identifies the parent only. Rebind every field after locks.
 select * into i from private.cohost_invitations where id=p_invitation_id;
 if not found or i.recipient_id<>actor then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 h:=private.lock_hangout(i.hangout_id);
 perform private.safety_lock_hangout_evidence(h.host_id,h.university_id);
 perform private.safety_lock_hangout_evidence(actor,h.university_id);
 perform 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=actor and p.state='joined' for share;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 select * into i from private.cohost_invitations where id=p_invitation_id for update;
 if not found or i.recipient_id<>actor or i.hangout_id<>h.id or i.host_id<>h.host_id
  or not private.pilot_capability_enabled('hangouts')
  or not private.hangouts_enabled()
  or not private.cohost_invitation_current(i.id,actor) then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 if p_accept then
  insert into private.hangout_cohosts(hangout_id,account_id) values(h.id,actor);
 end if;
 update private.cohost_invitations set state=case when p_accept then 'accepted' else 'declined' end,
  responded_at=clock_timestamp() where id=i.id;
 update public.hangouts set revision=revision+1,updated_at=clock_timestamp()
  where id=h.id returning revision into next_revision;
 return next_revision;
end $$;

create function public.withdraw_hangout_cohost_invitation(p_invitation_id uuid,p_expected_revision bigint)
returns bigint language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); i private.cohost_invitations; h public.hangouts; next_revision bigint;
begin
 perform private.social_hangout_mutation_lock();
 if actor is null or p_invitation_id is null or current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform private.pilot_evidence_lock();
 perform 1 from private.pilot_availability where singleton for share;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform 1 from private.pilot_capabilities where key='hangouts' for share;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 select * into i from private.cohost_invitations where id=p_invitation_id;
 if not found or i.host_id<>actor then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 h:=private.lock_hangout(i.hangout_id);
 perform private.safety_lock_hangout_evidence(i.recipient_id,h.university_id);
 select * into i from private.cohost_invitations where id=p_invitation_id for update;
 if not found or i.host_id<>actor or i.hangout_id<>h.id or i.state<>'pending'
  or not private.pilot_capability_enabled('hangouts')
  or not private.hangouts_enabled()
  or not private.cohost_invitation_current(i.id,i.recipient_id) then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform private.check_hangout_revision(h,p_expected_revision);
 update private.cohost_invitations set state='withdrawn',responded_at=clock_timestamp() where id=i.id;
 update public.hangouts set revision=revision+1,updated_at=clock_timestamp()
  where id=h.id returning revision into next_revision;
 return next_revision;
end $$;

-- Status is host-only and keyset-bounded. Only current-source states disclose
-- recipient identity; an ineligible source projects unavailable with no peer.
create function public.list_hangout_cohost_invitations(p_hangout_id uuid,p_after_created_at timestamptz default null,
 p_after_id uuid default null,p_limit integer default 24)
returns table(invitation_id uuid,recipient_id uuid,state text,created_at timestamptz)
language plpgsql volatile security definer set search_path='' as $$
declare h public.hangouts;
begin
 if auth.uid() is null or p_hangout_id is null or p_limit is null or p_limit not between 1 and 24
  or ((p_after_created_at is null)<>(p_after_id is null)) or current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 select * into h from public.hangouts where id=p_hangout_id for share;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform private.safety_lock_hangout_evidence(auth.uid(),h.university_id);
 if h.host_id<>auth.uid() or h.status<>'published' or not private.can_read_hangout(h.id) then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 return query select i.id,
  case when private.ready_subject_campus(i.recipient_id,h.university_id)
   and not private.safety_pair_blocked(h.host_id,i.recipient_id)
   and exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=i.recipient_id and p.state='joined')
   then i.recipient_id else null::uuid end,
  case when private.ready_subject_campus(i.recipient_id,h.university_id)
   and not private.safety_pair_blocked(h.host_id,i.recipient_id)
   and exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=i.recipient_id and p.state='joined')
   then i.state else 'unavailable' end,i.created_at
  from private.cohost_invitations i where i.hangout_id=h.id
   and (p_after_created_at is null or (i.created_at,i.id)<(p_after_created_at,p_after_id))
  order by i.created_at desc,i.id desc limit p_limit;
end $$;

revoke all on function public.invite_hangout_cohost(uuid,uuid,uuid,bigint),
 public.respond_hangout_cohost_invitation(uuid,boolean,bigint),
 public.withdraw_hangout_cohost_invitation(uuid,bigint),
 public.list_hangout_cohost_invitations(uuid,timestamptz,uuid,integer)
 from public,anon,authenticated,service_role;
grant execute on function public.invite_hangout_cohost(uuid,uuid,uuid,bigint),
 public.respond_hangout_cohost_invitation(uuid,boolean,bigint),
 public.withdraw_hangout_cohost_invitation(uuid,bigint),
 public.list_hangout_cohost_invitations(uuid,timestamptz,uuid,integer) to authenticated;
create or replace function public.list_notifications(p_after_created_at timestamptz default null,p_after_id uuid default null,p_limit integer default 24)
returns table(notification_id uuid,source_kind text,source_id uuid,event_code text,actor_id uuid,target_id uuid,label text,created_at timestamptz,read_at timestamptz)
language plpgsql volatile security definer set search_path='' as $$
declare owner_id uuid;
begin
 if p_limit is null or p_limit not between 1 and 24 or ((p_after_created_at is null)<>(p_after_id is null)) then
  raise exception 'Invalid notification page' using errcode='22023';end if;
 owner_id:=private.notification_require_owner();
 return query with page as materialized (
  select n.* from private.notification_items n where n.recipient_id=owner_id
  and (p_after_created_at is null or (n.created_at,n.id)<(p_after_created_at,p_after_id))
  order by n.created_at desc,n.id desc limit p_limit
 ), checked as (select n.*,case when n.source_kind='friendship' then
  private.friendship_enabled() and private.people_enabled()
  and exists(select 1 from private.friendships f where f.generation_id=n.target_id
   and f.low_id=least(owner_id,n.actor_id) and f.high_id=greatest(owner_id,n.actor_id)
   and ((n.event_code='friend_request' and f.state='pending' and f.requester_id=n.actor_id)
    or (n.event_code='friend_accepted' and f.state='accepted' and f.requester_id=owner_id)))
  and private.friendship_eligible(n.actor_id)
 when n.source_kind='dm' then private.dm_enabled() and private.people_enabled()
  and exists(select 1 from private.dm_pairs d where d.generation_id=n.target_id and d.state in('pending','accepted')
   and d.low_id=least(owner_id,n.actor_id) and d.high_id=greatest(owner_id,n.actor_id)
   and ((n.event_code='dm_request' and d.state='pending' and d.initiator_id=n.actor_id
     and n.source_id=d.generation_id and exists(select 1 from private.dm_messages m where m.generation_id=d.generation_id and m.sequence=1))
    or (n.event_code='dm_accepted' and d.state='accepted' and d.initiator_id=owner_id and n.source_id=d.generation_id)
    or (n.event_code='dm_message' and d.state='accepted' and exists(select 1 from private.dm_messages m
       where m.id=n.source_id and m.generation_id=d.generation_id and m.author_id=n.actor_id and (m.sequence>1 or d.consent_origin='friend')))))
  and private.dm_eligible(n.actor_id)
  and (n.event_code='dm_request' or private.dm_current_consent(n.target_id,owner_id,n.actor_id))
 when n.source_kind='hangout_invitation' then n.event_code='cohost_invitation'
  and n.source_id<>n.target_id and n.recipient_id=owner_id
  and private.cohost_invitation_current(n.source_id,owner_id)
  and exists(select 1 from private.cohost_invitations i where i.id=n.source_id
   and i.hangout_id=n.target_id and i.host_id=n.actor_id and i.recipient_id=owner_id)
 when n.source_kind='hangout' then
  not private.safety_pair_blocked(owner_id,n.actor_id) and (case when n.event_code='hangout_edited' then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangout_participants p where p.hangout_id=n.target_id and p.account_id=owner_id and p.state='joined')
    and exists(select 1 from public.hangouts h where h.id=n.target_id
      and (h.host_id=n.actor_id or private.can_read_hangout_roster(h.id,n.actor_id)))
   when n.event_code='hangout_cancelled' then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangout_participants p where p.hangout_id=n.target_id and p.account_id=owner_id and p.state='joined')
   when n.event_code in('hangout_joined','hangout_left') then private.can_read_hangout(n.target_id)
    and exists(select 1 from public.hangouts h where h.id=n.target_id and h.host_id=owner_id)
   else false end)
 when n.source_kind='hangout_chat' then n.event_code='hangout_chat_message'
  and private.chat_authorized(n.target_id)
  and not private.safety_pair_blocked(owner_id,n.actor_id)
  and exists(select 1 from private.hangout_conversations c join private.hangout_messages m on m.conversation_id=c.id
   where c.hangout_id=n.target_id and m.id=n.source_id and m.author_id=n.actor_id)
 else false end allowed from page n)
 select n.id,case when n.allowed then n.source_kind else null::text end,
 case when n.allowed then n.source_id else null::uuid end,
 case when n.allowed then n.event_code else null::text end,
 case when n.allowed and n.event_code not in('hangout_joined','hangout_left','hangout_chat_message') then n.actor_id else null::uuid end,
 case when n.allowed then n.target_id else null::uuid end,
 case when not n.allowed then 'Unavailable' when n.event_code='friend_request' then 'Friend request'
 when n.event_code='friend_accepted' then 'Friend request accepted' when n.event_code='dm_request' then 'Message request'
 when n.event_code='dm_accepted' then 'Message request accepted' when n.event_code='dm_message' then 'Direct message'
 when n.event_code='cohost_invitation' then 'Co-host invitation'
 when n.event_code='hangout_edited' then 'Hangout updated' when n.event_code='hangout_cancelled' then 'Hangout cancelled'
 when n.event_code='hangout_joined' then 'Someone joined your Hangout' when n.event_code='hangout_left' then 'Someone left your Hangout'
 else 'Hangout message' end,
 n.created_at,n.read_at from checked n order by n.created_at desc,n.id desc;
end; $$;

commit;

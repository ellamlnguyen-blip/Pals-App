-- ADR-0022 / TASK-018A. Disposable-local private self-reported attendance.
begin;

create table private.attendance_feature_gate (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into private.attendance_feature_gate(singleton,enabled) values(true,false);
alter table private.attendance_feature_gate enable row level security;
revoke all on private.attendance_feature_gate from public,anon,authenticated;

create table private.attendance_answers (
  hangout_id uuid not null,
  account_id uuid not null,
  attended boolean not null,
  revision bigint not null check (revision > 0),
  answered_at timestamptz not null,
  primary key (hangout_id,account_id),
  foreign key (hangout_id,account_id)
    references public.hangout_participants(hangout_id,account_id) on delete restrict
);
create index attendance_answers_owner_idx on private.attendance_answers(account_id,hangout_id);
alter table private.attendance_answers enable row level security;
revoke all on private.attendance_answers from public,anon,authenticated;

-- The Hangout UPDATE row lock is acquired before this trigger runs. Sampling
-- the clock here closes the direct-table and every RPC schedule-edit route.
create or replace function private.enforce_hangout_ownership() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.host_id is distinct from old.host_id or new.university_id is distinct from old.university_id
 or (old.status='cancelled' and (new.status<>'cancelled' or new is distinct from old))
 or (new.revision<>old.revision+1 and new is distinct from old) then
   raise exception 'Immutable Hangout ownership or lifecycle' using errcode='23514';
 end if;
 if (new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at)
   and clock_timestamp() >= coalesce(old.ends_at,old.starts_at+interval '2 hours') then
   raise exception 'Hangout schedule is closed' using errcode='23514';
 end if;
 return new;
end;
$$;

-- One statement snapshot for each owner read. No source, peer or safety
-- authorization helper is called: retained membership is the sole ID proof.
create function public.get_own_attendance(p_hangout_id uuid)
returns table(hangout_id uuid,attended boolean,revision bigint,answered_at timestamptz)
language sql stable security definer set search_path='' as $$
  select h.id,a.attended,a.revision,a.answered_at
  from public.hangouts h
  join public.hangout_participants p on p.hangout_id=h.id
    and p.account_id=auth.uid()
  left join private.attendance_answers a on a.hangout_id=h.id and a.account_id=p.account_id
  where h.id=p_hangout_id
    and current_setting('transaction_isolation')='read committed'
    and exists(select 1 from private.attendance_feature_gate g where g.singleton and g.enabled)
    and exists(select 1 from public.accounts x where x.id=auth.uid() and x.status='active')
    and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
    and statement_timestamp() >= coalesce(h.ends_at,h.starts_at+interval '2 hours');
$$;

create function public.list_own_attendance(p_before_hangout_id uuid default null)
returns table(hangout_id uuid,attended boolean,revision bigint,answered_at timestamptz,
  within_window boolean,currently_actionable boolean)
language sql stable security definer set search_path='' as $$
  select h.id,a.attended,a.revision,a.answered_at,
    statement_timestamp() < coalesce(h.ends_at,h.starts_at+interval '2 hours')+interval '30 days',
    statement_timestamp() < coalesce(h.ends_at,h.starts_at+interval '2 hours')+interval '30 days'
      and (h.status='published' or h.updated_at>=h.starts_at)
      and exists(select 1 from private.hangout_feature_gate s where s.singleton and s.enabled)
  from public.hangouts h
  join public.hangout_participants p on p.hangout_id=h.id and p.account_id=auth.uid()
  left join private.attendance_answers a on a.hangout_id=h.id and a.account_id=p.account_id
  where current_setting('transaction_isolation')='read committed'
    and exists(select 1 from private.attendance_feature_gate g where g.singleton and g.enabled)
    and exists(select 1 from public.accounts x where x.id=auth.uid() and x.status='active')
    and not exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
    and statement_timestamp() >= coalesce(h.ends_at,h.starts_at+interval '2 hours')
    and (p_before_hangout_id is null or h.id<p_before_hangout_id)
  order by h.id desc limit 24;
$$;

create function public.answer_own_attendance(p_hangout_id uuid,p_attended boolean,
  p_expected_revision bigint)
returns table(hangout_id uuid,attended boolean,revision bigint,answered_at timestamptz)
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); h public.hangouts; current_answer private.attendance_answers%rowtype;
  opened_at timestamptz; checked_at timestamptz;
begin
  if current_setting('transaction_isolation')<>'read committed' or actor is null
    or p_hangout_id is null or p_attended is null or p_expected_revision is null then
    raise exception 'Attendance unavailable' using errcode='42501';
  end if;
  perform private.social_hangout_mutation_lock();
  select * into h from public.hangouts where id=p_hangout_id for update;
  if not found then raise exception 'Attendance unavailable' using errcode='42501'; end if;
  -- Lock order: global advisory, parent, source gate, attendance gate,
  -- account, participant, existing answer. Each gate SHARE lock prevents
  -- a revocation from committing until this answer has committed.
  perform 1 from private.hangout_feature_gate where singleton for share;
  perform 1 from private.attendance_feature_gate where singleton for share;
  perform 1 from public.accounts where id=actor for share;
  perform 1 from public.hangout_participants p
    where p.hangout_id=h.id and p.account_id=actor for share;
  select a.* into current_answer from private.attendance_answers a
    where a.hangout_id=h.id and a.account_id=actor for update;
  opened_at:=coalesce(h.ends_at,h.starts_at+interval '2 hours');
  checked_at:=clock_timestamp();
  if not exists(select 1 from private.hangout_feature_gate where singleton and enabled)
    or not exists(select 1 from private.attendance_feature_gate where singleton and enabled)
    or not exists(select 1 from public.accounts where id=actor and status='active')
    or not exists(select 1 from public.hangout_participants p
      where p.hangout_id=h.id and p.account_id=actor)
    or exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
    or (h.status='cancelled' and h.updated_at<h.starts_at)
    or checked_at<opened_at or checked_at>=opened_at+interval '30 days' then
    raise exception 'Attendance unavailable' using errcode='42501';
  end if;
  if current_answer.hangout_id is not null and current_answer.attended=p_attended then
    return query select current_answer.hangout_id,current_answer.attended,
      current_answer.revision,current_answer.answered_at;
    return;
  end if;
  if p_expected_revision<>coalesce(current_answer.revision,0) then
    raise exception 'Attendance unavailable' using errcode='42501';
  end if;
  insert into private.attendance_answers as a(hangout_id,account_id,attended,revision,answered_at)
    values(h.id,actor,p_attended,p_expected_revision+1,checked_at)
    on conflict on constraint attendance_answers_pkey do update
      set attended=excluded.attended,revision=excluded.revision,answered_at=excluded.answered_at;
  return query select h.id,p_attended,p_expected_revision+1,checked_at;
end;
$$;

revoke all on function public.get_own_attendance(uuid),
  public.list_own_attendance(uuid),public.answer_own_attendance(uuid,boolean,bigint)
  from public,anon,authenticated;
grant execute on function public.get_own_attendance(uuid),
  public.list_own_attendance(uuid),public.answer_own_attendance(uuid,boolean,bigint)
  to authenticated;
commit;

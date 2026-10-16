-- Exact caller-owned invitation state for recipient UI and lost-response checks.
create function public.get_own_cohost_invitation(p_invitation_id uuid)
returns table(invitation_id uuid,hangout_id uuid,state text,revision bigint)
language plpgsql volatile security definer set search_path='' as $$
declare i private.cohost_invitations; h public.hangouts; actor uuid:=auth.uid();
begin
 if actor is null or p_invitation_id is null or current_setting('transaction_isolation')<>'read committed' then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 select * into i from private.cohost_invitations where id=p_invitation_id and recipient_id=actor;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 select * into h from public.hangouts where id=i.hangout_id for share;
 if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform private.safety_lock_hangout_evidence(h.host_id,h.university_id);
 perform private.safety_lock_hangout_evidence(actor,h.university_id);
 select * into i from private.cohost_invitations where id=p_invitation_id and recipient_id=actor;
 if not found or i.hangout_id<>h.id or i.host_id<>h.host_id
  or h.status<>'published' or h.visibility<>'campus'
  or not private.hangouts_enabled() or not private.pilot_capability_enabled('hangouts')
  or exists(select 1 from private.hangout_disables d where d.hangout_id=h.id)
  or not private.ready_subject_campus(actor,h.university_id)
  or not private.ready_subject_campus(h.host_id,h.university_id)
  or private.safety_pair_blocked(actor,h.host_id)
  or not private.can_read_hangout(h.id)
  or not exists(select 1 from public.hangout_participants p where p.hangout_id=h.id and p.account_id=actor and p.state='joined') then
  raise exception 'Invitation unavailable' using errcode='42501'; end if;
 return query select i.id,h.id,
  case when i.state='pending' and not private.cohost_invitation_current(i.id,actor)
   then 'unavailable' else i.state end,h.revision;
end $$;
revoke all on function public.get_own_cohost_invitation(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_own_cohost_invitation(uuid) to authenticated;

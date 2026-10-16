-- TASK-033D2U. Caller-bound facts for the direct-chat consent controls.
begin;

create function public.get_dm_consent_ui_state(p_peer_id uuid)
returns table(peer_id uuid,generation_id uuid,direction text,state text,
  consent_origin text,recipient_consented boolean,friend_send_available boolean,
  can_allow_dm boolean)
language sql volatile security definer set search_path = '' as $$
  with guard as materialized (select private.dm_require() allowed)
  select p_peer_id,d.generation_id,
    case when d.initiator_id=auth.uid() then 'outgoing' else 'incoming' end,
    d.state,d.consent_origin,d.recipient_consented,
    private.dm_eligible(p_peer_id)
      and private.dm_friendship_current(auth.uid(),p_peer_id),
    d.state='accepted' and d.consent_origin='friend'
      and d.initiator_id=p_peer_id and not d.recipient_consented
      and private.dm_eligible(p_peer_id)
  from guard g join private.dm_pairs d on g.allowed
    and d.low_id=least(auth.uid(),p_peer_id)
    and d.high_id=greatest(auth.uid(),p_peer_id)
    and d.state in ('pending','accepted');
$$;
revoke all on function public.get_dm_consent_ui_state(uuid) from public,anon,authenticated;
grant execute on function public.get_dm_consent_ui_state(uuid) to authenticated;

commit;

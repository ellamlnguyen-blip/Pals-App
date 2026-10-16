-- TASK-034C focused authenticated RPC contract. Run only after reviewed 00800
-- migration on a named disposable local database.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts','hangout_chat','people','dm');
update private.hangout_feature_gate set enabled=true where singleton;
update private.hangout_chat_feature_gate set enabled=true where singleton;
update private.people_feature_gate set enabled=true where singleton;
update private.dm_feature_gate set enabled=true where singleton;
update private.friendship_feature_gate set enabled=true where singleton;
update private.safety_feature_gate set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('534c0000-0000-4000-8000-000000000001','attention034c-1@unc.edu',now()),
 ('534c0000-0000-4000-8000-000000000002','attention034c-2@unc.edu',now()),
 ('534c0000-0000-4000-8000-000000000003','attention034c-3@unc.edu',now());
update public.profiles set real_name='Attention synthetic',major='Biology',graduation_year=2028,
 bio='Disposable attention test'
 where user_id::text like '534c0000-%';
insert into private.people_preferences(account_id,opted_in) values
 ('534c0000-0000-4000-8000-000000000001',true),
 ('534c0000-0000-4000-8000-000000000002',true),
 ('534c0000-0000-4000-8000-000000000003',true);
create function pg_temp.dm() returns uuid language sql as
 $$select current_setting('attention034c.dm')::uuid$$;
create function pg_temp.hangout() returns uuid language sql as
 $$select current_setting('attention034c.hangout')::uuid$$;
select ok(not has_table_privilege('authenticated','private.chat_attention_state','SELECT')
 and not has_table_privilege('authenticated','private.chat_attention_state','UPDATE')
 and not has_table_privilege('authenticated','private.chat_attention_snapshots','SELECT'),
 'owner state and ordered snapshots have no client table grants');
select ok(not has_function_privilege('authenticated','private.chat_attention_source(text,uuid)','EXECUTE')
 and not has_function_privilege('authenticated','private.chat_attention_visible(text,uuid,bigint,integer)','EXECUTE')
 and not has_function_privilege('authenticated','private.chat_attention_cleanup_expired(integer)','EXECUTE'),
 'private source, visibility and cleanup helpers are client revoked');
select ok((select provolatile='s' from pg_proc where oid='private.chat_attention_source(text,uuid)'::regprocedure)
 and (select provolatile='s' from pg_proc where oid='private.chat_attention_visible(text,uuid,bigint,integer)'::regprocedure),
 'nested source and visible projections share the calling statement snapshot');
set local role anon;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.list_my_chat_attention()$$,'42501',null,'anonymous inbox denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"534c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('attention034c.hangout',public.create_hangout(
 '534c0000-0000-4000-8001-000000000001','Attention hangout',now()+interval '2 hours',
 'Campus area',35,-79)::text,true);
select set_config('attention034c.dm',public.create_dm_request(
 '534c0000-0000-4000-8000-000000000002','534c0000-0000-4000-8002-000000000001',
 'First request')::text,true);
select is((public.list_my_chat_attention()->'items'->0->>'has_unread')::boolean,false,
 'outgoing pending management is not unread');
select throws_ok($$select public.touch_my_chat('dm',pg_temp.dm())$$,'42501',null,
 'pending management cannot be touched as a readable thread');
select throws_ok($$select public.acknowledge_chat_page('dm',pg_temp.dm(),1)$$,'42501',null,
 'pending outgoing body cannot be acknowledged');
select is(public.touch_my_chat('hangout',pg_temp.hangout()) is not null,true,
 'message-free Hangout touch persists server time');
select throws_ok($$select public.acknowledge_chat_page('hangout',pg_temp.hangout(),1)$$,
 '42501',null,'cannot acknowledge a nonexistent Hangout message');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"534c0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((public.list_my_chat_attention()->'items'->0->>'has_unread')::boolean,true,
 'pending incoming first body is unread');
select is(public.acknowledge_chat_page('dm',pg_temp.dm(),1),1::bigint,
 'recipient acknowledges exact first visible sequence');
select is(public.acknowledge_chat_page('dm',pg_temp.dm(),1),1::bigint,
 'replay remains monotonic');
select throws_ok($$select public.acknowledge_chat_page('dm',pg_temp.dm(),999)$$,'42501',null,
 'forged future maximum denied');
select is((public.list_my_chat_attention()->'items'->0->>'has_unread')::boolean,false,
 'acknowledgment is visible on authorized reread');
select is(public.transition_dm('534c0000-0000-4000-8000-000000000001',pg_temp.dm(),'accept'),true,
 'recipient accepts generation');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"534c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.send_dm_message('534c0000-0000-4000-8000-000000000002',pg_temp.dm(),
 '534c0000-0000-4000-8002-000000000002','Follow up') is not null,true,
 'accepted generation receives another message');
select is(public.acknowledge_chat_page('dm',pg_temp.dm(),2),2::bigint,
 'sender can advance visible page without self-unread');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"534c0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((public.list_my_chat_attention()->'items'->0->>'has_unread')::boolean,true,
 'new incoming message above watermark is unread');
select is(public.acknowledge_chat_page('dm',pg_temp.dm(),2),2::bigint,
 'reader advances only to delivered forward message');
reset role;
select is((select read_through_sequence from private.chat_attention_state where
 owner_id='534c0000-0000-4000-8000-000000000002' and source_kind='dm'
 and source_id=pg_temp.dm()),2::bigint,'watermark persisted privately');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"534c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $many$
begin
 for i in 1..26 loop
  perform public.create_hangout(gen_random_uuid(),'Attention page '||i,
   now()+interval '2 hours','Campus area',35,-79);
 end loop;
end $many$;
select pg_sleep(0.12);
select set_config('attention034c.page',public.list_my_chat_attention(null,24)::text,true);
select set_config('attention034c.cursor',current_setting('attention034c.page')::jsonb->>'next_cursor',true);
select is(jsonb_array_length(current_setting('attention034c.page')::jsonb->'items'),24,
 'first page is bounded after global mixed-source ordering');
select set_config('attention034c.second',public.list_my_chat_attention(
 current_setting('attention034c.cursor'),24)::text,true);
select is(jsonb_array_length(current_setting('attention034c.second')::jsonb->'items'),4,
 'second page includes remaining mixed sources');
select ok((current_setting('attention034c.second')::jsonb->'items'->0->>'source_kind')='hangout',
 'second page first candidate is a Hangout for revocation test');
select set_config('attention034c.revoked',current_setting('attention034c.second')::jsonb
 ->'items'->0->>'source_id',true);
select public.cancel_hangout(current_setting('attention034c.revoked')::uuid,1);
select is(jsonb_array_length(public.list_my_chat_attention(
 current_setting('attention034c.cursor'),24)->'items'),3,
 'cursor page drops the now-revoked Hangout instead of exposing its metadata');
select throws_ok($$select public.list_my_chat_attention('forged',24)$$,'42501',null,
 'forged cursor denied');
reset role;
insert into private.chat_attention_snapshots(owner_id,created_at,expires_at,items)
 values('534c0000-0000-4000-8000-000000000003',
  now()-interval '10 minutes',now()-interval '5 minutes','[]'::jsonb)
 on conflict(owner_id) do update set expires_at=excluded.expires_at;
update public.accounts set status='suspended'
 where id='534c0000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"534c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.list_my_chat_attention(null,24)$$,'42501',null,
 'suspended owner cannot start a page or perform cleanup');
select throws_ok($$select public.list_my_chat_attention(current_setting('attention034c.cursor'),24)$$,
 '42501',null,'suspended owner cannot use an old cursor');
reset role;
select ok(exists(select 1 from private.chat_attention_snapshots where
 owner_id='534c0000-0000-4000-8000-000000000003'),
 'denied first page did not clean another owner expired snapshot');
select * from finish();
rollback;

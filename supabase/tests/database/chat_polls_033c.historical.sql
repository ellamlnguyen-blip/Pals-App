-- TASK-033C disposable-local transactional poll authorization and persistence.
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
 ('533c0000-0000-4000-8000-000000000001','poll033c-1@unc.edu',now()),
 ('533c0000-0000-4000-8000-000000000002','poll033c-2@unc.edu',now()),
 ('533c0000-0000-4000-8000-000000000003','poll033c-3@unc.edu',now());
update public.profiles set real_name='Poll synthetic',major='Biology',graduation_year=2028,
 bio='Disposable poll test' where user_id::text like '533c0000-%';
insert into private.people_preferences(account_id,opted_in) values
 ('533c0000-0000-4000-8000-000000000001',true),
 ('533c0000-0000-4000-8000-000000000002',true),
 ('533c0000-0000-4000-8000-000000000003',true);
insert into private.friendships(low_id,high_id,requester_id,campus_id,state) values
 ('533c0000-0000-4000-8000-000000000001','533c0000-0000-4000-8000-000000000002',
  '533c0000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','accepted');
create function pg_temp.hid() returns uuid language sql as $$select current_setting('poll033c.hid')::uuid$$;
create function pg_temp.did() returns uuid language sql as $$select current_setting('poll033c.did')::uuid$$;
create function pg_temp.hp() returns uuid language sql as $$select current_setting('poll033c.hp')::uuid$$;
create function pg_temp.dp() returns uuid language sql as $$select current_setting('poll033c.dp')::uuid$$;
create function pg_temp.rid() returns uuid language sql as $$select current_setting('poll033c.rid')::uuid$$;
create function pg_temp.rp() returns uuid language sql as $$select current_setting('poll033c.rp')::uuid$$;
create function pg_temp.opt(p uuid,n integer) returns uuid language sql security definer set search_path='' as
 $$select id from private.chat_poll_options where poll_id=p and ordinal=n$$;
select ok(not has_table_privilege('authenticated','private.chat_polls','SELECT')
 and not has_table_privilege('authenticated','private.chat_poll_votes','INSERT'),
 'private poll and vote relations have no client grant');
select ok(not has_function_privilege('authenticated','private.chat_poll_lock_source(text,uuid,uuid)','EXECUTE'),
 'source lock helper is not client callable');
set local role anon;
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select public.create_chat_poll('hangout',gen_random_uuid(),null,gen_random_uuid(),'Q?',array['A','B'])$$,
 '42501',null,'anonymous create denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('poll033c.hid',public.create_hangout('533c0000-0000-4000-8001-000000000001',
 'Poll fixture',now()+interval '2 hours','Campus area',35,-79)::text,true);
select set_config('poll033c.did',(select generation_id from public.send_friend_dm_message(
 '533c0000-0000-4000-8000-000000000002','533c0000-0000-4000-8002-000000000001','Hello'))::text,true);
select set_config('poll033c.hp',public.create_chat_poll('hangout',pg_temp.hid(),null,
 '533c0000-0000-4000-8002-000000000002','  Where?  ',array['  Tacos  ','Library'])::text,true);
reset role;
select is((select count(*) from private.hangout_messages m join private.hangout_conversations c
 on c.id=m.conversation_id where c.hangout_id=pg_temp.hid()),0::bigint,
 'poll creation adds no chat message');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.create_chat_poll('hangout',pg_temp.hid(),null,
 '533c0000-0000-4000-8002-000000000002','Where?',array['Tacos','Library']),
 pg_temp.hp(),'exact create retry is stable');
select throws_ok($$select public.create_chat_poll('hangout',pg_temp.hid(),null,
 '533c0000-0000-4000-8002-000000000002','Changed?',array['Tacos','Library'])$$,
 '23505',null,'changed create payload conflicts');
select throws_ok($$select public.create_chat_poll('hangout',pg_temp.hid(),null,
 gen_random_uuid(),'Question',array['same',' same '])$$,
 '22023',null,'trimmed duplicate options denied');
select throws_ok($$select public.create_chat_poll('hangout',pg_temp.hid(),null,
 gen_random_uuid(),'Question',array[]::text[])$$,
 '22023',null,'empty options denied');
select set_config('poll033c.dp',public.create_chat_poll('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000002','533c0000-0000-4000-8002-000000000003',
 'Lunch?',array['Yes','No'])::text,true);
select is(jsonb_array_length(public.list_chat_polls('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000002')),1,'creator reads DM poll');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select throws_ok($$select public.list_chat_polls('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000001')$$,'42501',null,'third party DM read denied');
select throws_ok($$select public.vote_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 pg_temp.opt(pg_temp.hp(),1),gen_random_uuid())$$,'42501',null,'nonmember vote denied');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid());
select is(jsonb_array_length(public.list_chat_polls('hangout',pg_temp.hid(),null)),1,
 'joined member reads poll without a separate chat join');
select is((public.vote_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 pg_temp.opt(pg_temp.hp(),1),'533c0000-0000-4000-8002-000000000004')->>'applied')::boolean,
 true,'member casts vote');
select is((public.vote_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 pg_temp.opt(pg_temp.hp(),2),'533c0000-0000-4000-8002-000000000005')->>'applied')::boolean,
 true,'member changes vote');
select is((public.vote_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 pg_temp.opt(pg_temp.hp(),1),'533c0000-0000-4000-8002-000000000004')->>'applied')::boolean,
 false,'stale exact retry cannot roll current choice back');
select is((public.list_chat_polls('hangout',pg_temp.hid(),null)->0->>'my_option_id')::uuid,
 pg_temp.opt(pg_temp.hp(),2),'current own choice projected');
select is((public.list_chat_polls('hangout',pg_temp.hid(),null)->0->'options'->1->>'votes')::integer,
 1,'aggregate counts current vote');
select throws_ok($$select public.close_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),gen_random_uuid())$$,
 '42501',null,'noncreator cannot close');
select public.leave_hangout(pg_temp.hid());
select throws_ok($$select public.list_chat_polls('hangout',pg_temp.hid(),null)$$,
 '42501',null,'leave revokes poll read');
select throws_ok($$select public.vote_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 pg_temp.opt(pg_temp.hp(),1),gen_random_uuid())$$,'42501',null,'leave revokes vote');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((public.list_chat_polls('hangout',pg_temp.hid(),null)->0->'options'->1->>'votes')::integer,
 0,'departed participant vote hidden from aggregate');
select is((public.close_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 '533c0000-0000-4000-8002-000000000006')->>'poll_id')::uuid,pg_temp.hp(),'creator closes poll');
select throws_ok($$select public.vote_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 pg_temp.opt(pg_temp.hp(),1),gen_random_uuid())$$,'42501',null,'closed poll denies vote');
select is((public.close_chat_poll('hangout',pg_temp.hid(),null,pg_temp.hp(),
 '533c0000-0000-4000-8002-000000000006')->>'poll_id')::uuid,pg_temp.hp(),'close retry stable');
select is((select count(*) from generate_series(1,4) n cross join lateral
 public.create_chat_poll('hangout',pg_temp.hid(),null,gen_random_uuid(),
  'Next plan '||n,array['Yes','No']) poll_id),4::bigint,'five polls total permitted');
select throws_ok($$select public.create_chat_poll('hangout',pg_temp.hid(),null,
 gen_random_uuid(),'Sixth',array['Yes','No'])$$,'22023',null,'sixth poll rate limited');
select throws_ok($$select public.list_chat_polls('hangout',pg_temp.hid(),null,null,null,25)$$,
 '22023',null,'page limit bounded');
select throws_ok($$select public.list_chat_polls('hangout',pg_temp.hid(),null,now(),null,1)$$,
 '22023',null,'partial cursor denied');
select set_config('poll033c.open',public.list_chat_polls('hangout',pg_temp.hid(),null)->0->>'poll_id',true);
reset role;
with fixture as (
 insert into private.chat_polls(kind,source_id,creator_id,question,created_at)
 select 'hangout',pg_temp.hid(),'533c0000-0000-4000-8000-000000000001',
  'Synthetic page '||n,clock_timestamp()-n*interval '1 second'
 from generate_series(1,25) n returning id)
insert into private.chat_poll_options(poll_id,ordinal,label)
select fixture.id,n,case n when 1 then 'Yes' else 'No' end
from fixture cross join generate_series(1,2) n;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(jsonb_array_length(public.list_chat_polls('hangout',pg_temp.hid(),null)),24,
 'first poll page capped at 24');
select set_config('poll033c.cursor_at',
 public.list_chat_polls('hangout',pg_temp.hid(),null)->23->>'created_at',true);
select set_config('poll033c.cursor_id',
 public.list_chat_polls('hangout',pg_temp.hid(),null)->23->>'poll_id',true);
select is(jsonb_array_length(public.list_chat_polls('hangout',pg_temp.hid(),null,
 current_setting('poll033c.cursor_at')::timestamptz,current_setting('poll033c.cursor_id')::uuid)),
 6,'second keyset page contains remainder');
select is((select count(distinct x->>'poll_id') from jsonb_array_elements(
 public.list_chat_polls('hangout',pg_temp.hid(),null) ||
 public.list_chat_polls('hangout',pg_temp.hid(),null,
  current_setting('poll033c.cursor_at')::timestamptz,current_setting('poll033c.cursor_id')::uuid)) x),
 30::bigint,'keyset traversal neither skips nor repeats a poll');
reset role;
update private.hangout_chat_feature_gate set enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.close_chat_poll('hangout',pg_temp.hid(),null,
 current_setting('poll033c.open')::uuid,gen_random_uuid())$$,
 '42501',null,'creator cannot close after current chat authority revoked');
select throws_ok($$select public.create_chat_poll('hangout',pg_temp.hid(),null,
 '533c0000-0000-4000-8002-000000000002','Where?',array['Tacos','Library'])$$,
 '42501',null,'gate revokes exact create retry');
reset role;
update private.hangout_chat_feature_gate set enabled=true where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(jsonb_array_length(public.list_chat_polls('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000001')),1,'DM peer reads accepted poll');
select is(public.set_people_preference(false),false,'peer opts out of People');
select throws_ok($$select public.list_chat_polls('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000001')$$,'42501',null,'opt-out revokes poll read');
select throws_ok($$select public.vote_chat_poll('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000001',pg_temp.dp(),
 pg_temp.opt(pg_temp.dp(),1),gen_random_uuid())$$,'42501',null,'opt-out revokes vote');
select is(public.set_people_preference(true),true,'peer restores People consent');
reset role;
update private.dm_feature_gate set enabled=false where singleton;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.list_chat_polls('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000002')$$,'42501',null,'DM gate revokes read');
select throws_ok($$select public.create_chat_poll('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000002','533c0000-0000-4000-8002-000000000003',
 'Lunch?',array['Yes','No'])$$,'42501',null,'DM gate revokes exact create retry');
reset role;
update private.dm_feature_gate set enabled=true where singleton;
delete from private.friendships where low_id='533c0000-0000-4000-8000-000000000001'
 and high_id='533c0000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.list_chat_polls('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000002')$$,'42501',null,'unfriend revokes friend-origin poll read');
select throws_ok($$select public.create_chat_poll('dm',pg_temp.did(),
 '533c0000-0000-4000-8000-000000000002','533c0000-0000-4000-8002-000000000003',
 'Lunch?',array['Yes','No'])$$,'42501',null,'unfriend revokes create retry');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select set_config('poll033c.rid',public.create_dm_request(
 '533c0000-0000-4000-8000-000000000001','533c0000-0000-4000-8002-000000000091',
 'Request first')::text,true);
select throws_ok($$select public.create_chat_poll('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000001',gen_random_uuid(),
 'Pending?',array['Yes','No'])$$,'42501',null,'pending DM cannot create poll');
select throws_ok($$select public.list_chat_polls('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000001')$$,'42501',null,'pending DM cannot read polls');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.list_chat_polls('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000003')$$,'42501',null,'pending recipient cannot read polls');
select ok(public.transition_dm('533c0000-0000-4000-8000-000000000003',pg_temp.rid(),'accept'),
 'recipient accepts request-origin generation');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select set_config('poll033c.rp',public.create_chat_poll('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000001','533c0000-0000-4000-8002-000000000092',
 'Accepted request?',array['Yes','No'])::text,true);
select is(jsonb_array_length(public.list_chat_polls('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000001')),1,'request-origin creator reads poll');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(jsonb_array_length(public.list_chat_polls('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000003')),1,'accepted request-origin recipient reads poll');
select is((public.vote_chat_poll('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000003',pg_temp.rp(),pg_temp.opt(pg_temp.rp(),1),
 gen_random_uuid())->>'applied')::boolean,true,'accepted request-origin recipient votes');
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select ok(public.set_people_block('533c0000-0000-4000-8000-000000000001',true),
 'block terminates request-origin generation');
select throws_ok($$select public.list_chat_polls('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000001')$$,'42501',null,'block hides prior poll');
select throws_ok($$select public.close_chat_poll('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000001',pg_temp.rp(),gen_random_uuid())$$,
 '42501',null,'blocked creator cannot close');
select throws_ok($$select public.create_chat_poll('dm',pg_temp.rid(),
 '533c0000-0000-4000-8000-000000000001','533c0000-0000-4000-8002-000000000092',
 'Accepted request?',array['Yes','No'])$$,'42501',null,'blocked exact retry denied');
select set_config('poll033c.terminal',public.create_dm_request(
 '533c0000-0000-4000-8000-000000000002',gen_random_uuid(),'Second request')::text,true);
select set_config('request.jwt.claims','{"sub":"533c0000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select ok(public.transition_dm('533c0000-0000-4000-8000-000000000003',
 current_setting('poll033c.terminal')::uuid,'accept'),'second request accepted');
select ok(public.transition_dm('533c0000-0000-4000-8000-000000000003',
 current_setting('poll033c.terminal')::uuid,'close'),'second generation closed');
select throws_ok($$select public.list_chat_polls('dm',
 current_setting('poll033c.terminal')::uuid,
 '533c0000-0000-4000-8000-000000000003')$$,
 '42501',null,'closed terminal generation cannot read polls');
select * from finish();
rollback;

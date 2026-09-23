begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();

-- Disposable fixtures: host 1, peer 2, other attendee 3, other host 4.
insert into auth.users(id,email,email_confirmed_at)
select ('51600000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'global-block-'||n||'@unc.edu',now() from generate_series(1,5) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
from public.accounts where id::text like '51600000-%';
update public.profiles set real_name='Safety fixture',major='Biology',graduation_year=2028,
  bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
where user_id::text like '51600000-%';
insert into private.people_preferences(account_id,opted_in)
select id,true from public.accounts where id::text like '51600000-%';
create function pg_temp.person(n integer) returns uuid language sql as $$
  select ('51600000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid $$;
create function pg_temp.key(n integer) returns uuid language sql as $$
  select ('51600000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid $$;
create function pg_temp.hid(n integer) returns uuid language sql as $$
  select current_setting('safety.h'||n)::uuid $$;
create function pg_temp.start_at() returns timestamptz language sql as $$
  select current_setting('safety.start')::timestamptz $$;
select set_config('safety.start',(now()+interval '1 hour')::text,true);

set local role anon;
select throws_ok($$select public.set_safety_block('51600000-0000-4000-8000-000000000002',true)$$,
  '42501',null,'anon cannot write block');
select throws_ok($$select * from public.list_my_retained_hangout_ids()$$,
  '42501',null,'anon cannot recover retained membership');
select throws_ok($$select * from private.people_blocks$$,'42501',null,'anon cannot read block relation');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.set_safety_block('51600000-0000-4000-8000-000000000002',true)$$,
  '42501',null,'new safety gate defaults off');
select throws_ok($$select public.set_people_block('51600000-0000-4000-8000-000000000002',true)$$,
  '42501',null,'old block RPC cannot bypass safety gate');
select throws_ok($$select * from public.list_people_blocked_ids()$$,
  '42501',null,'outbound ID list safety gated');
select throws_ok($$select * from public.list_my_retained_hangout_ids()$$,
  '42501',null,'retained ID list safety gated');
select throws_ok($$select * from private.hangout_peer_provenance$$,
  '42501',null,'authenticated cannot read peer provenance');
select throws_ok($$update private.safety_feature_gate set enabled=true$$,
  '42501',null,'authenticated cannot change safety gate');
select throws_ok($$select public.transition_friendship('51600000-0000-4000-8000-000000000002',
  '51600000-0000-4000-8001-000000000001','accept')$$,
  '42501',null,'authenticated cannot call internal friendship transition');
reset role;

update private.people_feature_gate set enabled=true;
update private.friendship_feature_gate set enabled=true;
update private.dm_feature_gate set enabled=true;
update private.hangout_feature_gate set enabled=true;
update private.hangout_chat_feature_gate set enabled=true;
update private.notification_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('safety.h1',public.create_hangout(pg_temp.key(1),'Host secret',
  pg_temp.start_at(),'Host area',35,-79,p_private_instructions=>'Door code')::text,true);
select set_config('safety.h2',public.create_hangout(pg_temp.key(2),'Second shared',
  pg_temp.start_at(),'Second area',35,-79)::text,true);
select public.create_friend_request(pg_temp.person(2),pg_temp.key(11));
select public.create_dm_request(pg_temp.person(2),pg_temp.key(12),'Before block');
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid(1));
select public.join_hangout(pg_temp.hid(2));
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid(1));
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.hangout_participants where hangout_id=pg_temp.hid(1)),
  3::bigint,'baseline roster visible before block');
select is((select count(*) from public.hangout_private_locations where hangout_id=pg_temp.hid(1)),
  1::bigint,'baseline private location visible to host');
select is((select count(*) from public.send_hangout_message(pg_temp.hid(1),pg_temp.key(13),'Host text')),
  1::bigint,'baseline host chat send');
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.send_hangout_message(pg_temp.hid(1),pg_temp.key(14),'Peer text')),
  1::bigint,'baseline peer chat send');

-- A stored block remains authoritative for reads while block management is off.
reset role;
insert into private.people_blocks(blocker_id,blocked_id) values(pg_temp.person(1),pg_temp.person(2));
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id=pg_temp.hid(1)),0::bigint,
  'stored host block hides public Hangout while safety gate is off');
select is((select count(*) from public.hangout_private_locations where hangout_id=pg_temp.hid(1)),
  0::bigint,'stored host block hides private instructions');
select is((select count(*) from public.hangout_participants where hangout_id=pg_temp.hid(1)),
  0::bigint,'stored host block hides roster');
select throws_ok($$select public.join_hangout(pg_temp.hid(1))$$,'42501',null,
  'stored host block denies join');
reset role;
delete from private.people_blocks where blocker_id=pg_temp.person(1) and blocked_id=pg_temp.person(2);
update private.safety_feature_gate set enabled=true;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.set_safety_block(pg_temp.person(2),true),true,
  'host can block current attendee');
select is(public.set_people_block(pg_temp.person(2),true),true,
  'old RPC retries through same policy');
select is((select count(*) from public.list_people_blocked_ids() where account_id=pg_temp.person(2)),
  1::bigint,'outbound ID list returns exact peer ID only');
select is(public.get_hangout_participant_state(pg_temp.hid(1),pg_temp.person(2)),null::text,
  'host cannot read blocked peer state');
select is(public.get_hangout_participant_state(pg_temp.hid(1),pg_temp.person(1)),'joined',
  'host retains own state');
select is((select count(*) from public.hangout_participants where hangout_id=pg_temp.hid(1)
  and account_id=pg_temp.person(2)),0::bigint,'blocked attendee absent from direct roster');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid(1)) where body='Peer text'),
  0::bigint,'blocked author message removed before chat page');
select is((select count(*) from public.list_notifications() where actor_id=pg_temp.person(2)),
  0::bigint,'blocked actor absent from notification projection');
select ok((select bool_and(source_kind is null and source_id is null and event_code is null
  and actor_id is null and target_id is null and label='Unavailable')
  from public.list_notifications() where label='Unavailable'),
  'neutral notification carries no source or target detail');
select throws_ok($$select public.create_friend_request('51600000-0000-4000-8000-000000000002',
  '51600000-0000-4000-8001-000000000015')$$,'42501',null,'friendship cannot reform');
select throws_ok($$select public.create_dm_request('51600000-0000-4000-8000-000000000002',
  '51600000-0000-4000-8001-000000000016','Retry')$$,'42501',null,'DM cannot reform');
reset role;
select is((select state from public.hangout_participants where hangout_id=pg_temp.hid(1)
  and account_id=pg_temp.person(2)),'removed','host block removes peer');
select is((select state from public.hangout_participants where hangout_id=pg_temp.hid(2)
  and account_id=pg_temp.person(2)),'removed','host block reconciles second shared Hangout');
select is((select count(*) from private.friendships where low_id=pg_temp.person(1)
  and high_id=pg_temp.person(2)),0::bigint,'block tears down friendship');
select is((select state from private.dm_pairs where low_id=pg_temp.person(1)
  and high_id=pg_temp.person(2)),'blocked','block terminates DM generation');
select ok((select count(*)>=2 from private.hangout_peer_provenance where low_id=pg_temp.person(1)
  and high_id=pg_temp.person(2)),'shared Hangout provenance retained privately');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id in(pg_temp.hid(1),pg_temp.hid(2))),
  0::bigint,'blocked attendee cannot see either host Hangout');
select is(public.get_hangout_participant_state(pg_temp.hid(1),pg_temp.person(2)),'removed',
  'removed caller can recover own state');
select is((select count(*) from public.list_my_retained_hangout_ids() where hangout_id in
  (pg_temp.hid(1),pg_temp.hid(2)) and own_state='removed'),2::bigint,
  'ID-only recovery includes both removed memberships');
select throws_ok($$select * from public.read_hangout_messages(pg_temp.hid(1))$$,
  '42501',null,'blocked attendee cannot read chat');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(1),
  '51600000-0000-4000-8001-000000000014','Peer text')$$,'42501',null,
  'exact chat retry cannot replay body after removal');
select throws_ok($$select public.join_hangout(pg_temp.hid(1))$$,'42501',null,
  'removed blocked peer cannot rejoin');
select throws_ok($$select * from public.list_my_retained_hangout_ids(p_limit=>25)$$,
  '22023',null,'retained ID page capped at 24');
select throws_ok($$select * from public.list_people_blocked_ids(p_limit=>25)$$,
  '22023',null,'block ID page capped at 24');
reset role;

-- A nonhost outbound block leaves the blocker, without hiding the third-party host.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select set_config('safety.h3',public.create_hangout(pg_temp.key(3),'Third-party host',
  pg_temp.start_at(),'Third-party area',35,-79)::text,true);
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid(3));
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.join_hangout(pg_temp.hid(3));
select is(public.set_safety_block(pg_temp.person(2),true),true,
  'nonhost blocks another attendee with retained overlap');
select is((select count(*) from public.hangouts where id=pg_temp.hid(3)),1::bigint,
  'third-party public Hangout remains visible to blocker');
select is((select count(*) from public.hangout_participants where hangout_id=pg_temp.hid(3)
  and account_id=pg_temp.person(2)),0::bigint,'blocked peer hidden from direct roster');
select is(public.get_hangout_participant_state(pg_temp.hid(3),pg_temp.person(3)),'left',
  'nonhost recovers own left state');
select throws_ok($$select public.join_hangout(pg_temp.hid(3))$$,'42501',null,
  'nonhost blocker cannot rejoin while blocked peer remains joined');
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.hangouts where id=pg_temp.hid(3)),1::bigint,
  'attendee-only block does not hide third-party host row');
reset role;
select is((select state from public.hangout_participants where hangout_id=pg_temp.hid(3)
  and account_id=pg_temp.person(3)),'left','nonhost blocker leaves shared Hangout');
select is((select state from public.hangout_participants where hangout_id=pg_temp.hid(3)
  and account_id=pg_temp.person(2)),'joined','nonhost target remains joined');

-- An unfriended pair remains provable from its immutable create ledger, even
-- after the target opts out and current People visibility is lost.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('safety.friend_generation',public.create_friend_request(pg_temp.person(5),pg_temp.key(25))::text,true);
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select ok(public.accept_friend_request(pg_temp.person(1),current_setting('safety.friend_generation')::uuid),
  'fifth peer accepts friendship');
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(public.unfriend(pg_temp.person(5),current_setting('safety.friend_generation')::uuid),
  'friendship is removed');
reset role;
update private.people_preferences set opted_in=false where account_id=pg_temp.person(5);
-- Exact owner unblock remains possible with People/source gates off. It does not restore relations.
update private.people_feature_gate set enabled=false;
update private.friendship_feature_gate set enabled=false;
update private.dm_feature_gate set enabled=false;
update private.hangout_feature_gate set enabled=false;
update private.hangout_chat_feature_gate set enabled=false;
update private.notification_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51600000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.set_safety_block(pg_temp.person(5),true),true,
  'retained friendship ledger permits blocking hidden former friend with People off');
select throws_ok($$select public.set_safety_block('51600000-0000-4000-8000-000000000004',true)$$,
  '42501',null,'People gate off denies guessed visible peer without retained evidence');
select is(public.set_safety_block(pg_temp.person(2),false),false,
  'exact outbound unblock works with People and source gates off');
select is(public.set_safety_block(pg_temp.person(2),true),true,
  'retained overlap permits a new block with People gate off');
select is(public.set_safety_block(pg_temp.person(2),false),false,
  'retained-evidence block can be unblocked');
select is((select count(*) from public.list_people_blocked_ids()),1::bigint,
  'ID list still works with People gate off');
select is((select count(*) from public.list_my_retained_hangout_ids() where own_state='joined'),
  2::bigint,'own retained IDs remain available with Hangout gate off');
reset role;
select is((select state from public.hangout_participants where hangout_id=pg_temp.hid(1)
  and account_id=pg_temp.person(2)),'removed','unblock does not restore attendance');
select is((select count(*) from private.friendships where low_id=pg_temp.person(1)
  and high_id=pg_temp.person(2)),0::bigint,'unblock does not restore friendship');
select is((select state from private.dm_pairs where low_id=pg_temp.person(1)
  and high_id=pg_temp.person(2)),'blocked','unblock does not restore DM');
update private.safety_feature_gate set enabled=false;
select * from finish();
rollback;

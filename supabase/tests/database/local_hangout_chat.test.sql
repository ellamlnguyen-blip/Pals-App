begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id,email,email_confirmed_at)
select ('51300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
  'task013a-'||n||'@unc.edu',now() from generate_series(1,5) n;
insert into storage.objects(bucket_id,name,owner_id)
select 'profile-photos',id::text||'/primary.png',id::text
  from public.accounts where id::text like '51300000-%';
update public.profiles set real_name='Chat fixture',major='Science',graduation_year=2028,
  bio='Local test',primary_photo_path=user_id::text||'/primary.png'
  where user_id::text like '51300000-%';
insert into public.universities(id,slug,name,active,allowed_email_domains)
values ('51300000-0000-4000-8000-000000000099','chat-other-campus','Other campus',true,array['unc.edu']);
update public.university_memberships set university_id='51300000-0000-4000-8000-000000000099'
  where user_id='51300000-0000-4000-8000-000000000005';
insert into public.platform_roles(user_id,role)
values ('51300000-0000-4000-8000-000000000004','admin');

create function pg_temp.hid() returns uuid language sql as
  $$select current_setting('chat.hangout')::uuid$$;
create function pg_temp.key(n integer) returns uuid language sql as
  $$select ('51300000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid$$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages('51300000-0000-4000-8000-000000000010')$$,
  '42501',null,'both gates off deny a read');
select throws_ok($$select public.send_hangout_message('51300000-0000-4000-8000-000000000010',pg_temp.key(1),'Hello')$$,
  '42501',null,'both gates off deny a send');
select throws_ok($$select * from private.hangout_messages$$,'42501',null,'direct private read denied');
select throws_ok($$insert into private.hangout_messages default values$$,'42501',null,'direct private write denied');
select throws_ok($$update private.hangout_chat_feature_gate set enabled=true$$,'42501',null,'client cannot enable chat');
reset role;
update private.hangout_chat_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages('51300000-0000-4000-8000-000000000010')$$,
  '42501',null,'chat gate alone is insufficient');
reset role;
update private.hangout_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select set_config('chat.hangout',public.create_hangout(pg_temp.key(900),'Chat',now()+interval '1 hour','Area',35,-79)::text,true);
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),0::bigint,'authorized empty thread');
select throws_ok($$select * from private.hangout_conversations$$,'42501',null,'conversation table private');
select is((select body from public.send_hangout_message(pg_temp.hid(),pg_temp.key(1),'  Hello  ')),
  'Hello','send trims body');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),1::bigint,'host reads sent message');
select is((select author_id from public.read_hangout_messages(pg_temp.hid())),auth.uid(),'current author ID visible');
select is((select mine from public.read_hangout_messages(pg_temp.hid())),true,'mine projected');
select is((select message_id from public.send_hangout_message(pg_temp.hid(),pg_temp.key(1),'Hello')),
  (select message_id from public.read_hangout_messages(pg_temp.hid())),'exact retry returns original');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(1),'Changed')$$,
  '23505',null,'changed payload and reused key conflict');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),1::bigint,'retry leaves one message');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(2),'   ')$$,
  '22023',null,'blank body denied');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(2),repeat('x',2001))$$,
  '22023',null,'oversize body denied');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),null,'Text')$$,
  '22023',null,'missing key denied');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid(),null,0)$$,
  '22023',null,'zero page limit denied');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid(),null,51)$$,
  '22023',null,'over-limit page denied');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid(),0,1)$$,
  '22023',null,'invalid cursor denied');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid(),null,null)$$,
  '22023',null,'null limit denied');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid(),null,-1)$$,
  '22023',null,'negative limit denied');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid(),-1,1)$$,
  '22023',null,'negative cursor denied');

select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'campus discoverer denied');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(2),'No')$$,'42501',null,'discoverer cannot send');
select lives_ok($$select public.join_hangout(pg_temp.hid())$$,'ready peer joins');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),1::bigint,'late join sees earlier content');
select is((select mine from public.read_hangout_messages(pg_temp.hid())),false,'peer message is not mine');
select is((select sequence from public.send_hangout_message(pg_temp.hid(),pg_temp.key(2),'Peer')),
  2::bigint,'sequence advances');
select lives_ok($$select public.leave_hangout(pg_temp.hid())$$,'peer leaves');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'left peer loses history');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(2),'Peer')$$,'42501',null,'revoked retry denied');
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select author_id from public.read_hangout_messages(pg_temp.hid()) where sequence=2),
  null::uuid,'left author ID withheld from joined host');
select is((select author_label from public.read_hangout_messages(pg_temp.hid()) where sequence=2),
  'Former participant','left author gets neutral label');
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok($$select public.join_hangout(pg_temp.hid())$$,'peer rejoins');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),2::bigint,'rejoin regains history');

select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select lives_ok($$select public.join_hangout(pg_temp.hid())$$,'second peer joins');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),2::bigint,'second late join sees history');
reset role;
insert into private.people_blocks(blocker_id,blocked_id)
  values ('51300000-0000-4000-8000-000000000001','51300000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),2::bigint,'People block does not change local chat');
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000004","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'platform admin has no bypass');
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000005","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'other campus denied');
set local role anon;
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'anon function denied');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated","platform_role":"admin"}',true);
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),2::bigint,'JWT role claim adds nothing');
reset role;
update public.profiles set primary_photo_path=null where user_id='51300000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select author_id from public.read_hangout_messages(pg_temp.hid()) where sequence=2),
  null::uuid,'unready author ID withheld');
select is((select author_label from public.read_hangout_messages(pg_temp.hid()) where sequence=2),
  'Former participant','unready author neutral label');
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'unready member denied');
reset role;
update public.profiles set primary_photo_path=user_id::text||'/primary.png'
  where user_id='51300000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$select public.remove_hangout_participant(pg_temp.hid(),'51300000-0000-4000-8000-000000000002')$$,'host removes peer');
select is((select author_id from public.read_hangout_messages(pg_temp.hid()) where sequence=2),
  null::uuid,'removed author ID withheld');
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'removed peer denied');
select throws_ok($$select public.join_hangout(pg_temp.hid())$$,'42501',null,'removed peer cannot rejoin');
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*) from public.read_hangout_messages(pg_temp.hid(),1,1)),1::bigint,'keyset page after first');
select is((select min(sequence) from public.read_hangout_messages(pg_temp.hid(),1,1)),2::bigint,'cursor excludes prior row');
reset role;
update auth.users set email='changed@example.invalid' where id='51300000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'changed Auth email revokes read');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(3),'No')$$,'42501',null,'changed Auth email revokes send');
reset role;
update auth.users set email='task013a-1@unc.edu' where id='51300000-0000-4000-8000-000000000001';
update public.accounts set status='suspended' where id='51300000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'suspended host loses chat');
reset role;
update public.accounts set status='active' where id='51300000-0000-4000-8000-000000000001';
update public.university_memberships set university_id='51300000-0000-4000-8000-000000000099'
  where user_id='51300000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'campus transfer revokes chat');
reset role;
update public.university_memberships set university_id='00000000-0000-4000-8000-000000000001'
  where user_id='51300000-0000-4000-8000-000000000001';
update private.hangout_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'Hangout gate independently revokes chat');
reset role;
update private.hangout_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
begin
  for i in 3..55 loop
    perform public.send_hangout_message(pg_temp.hid(),pg_temp.key(i),'Page '||i);
  end loop;
end;
$$;
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),50::bigint,'default page capped at 50');
select is((select max(sequence) from public.read_hangout_messages(pg_temp.hid())),50::bigint,'first page ends at 50');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid(),50,50)),5::bigint,'second page has remaining rows');
select is((select min(sequence) from public.read_hangout_messages(pg_temp.hid(),50,50)),51::bigint,'second page starts at 51');
select is((select count(distinct sequence) from public.read_hangout_messages(pg_temp.hid(),50,50)),5::bigint,'no duplicate page order');
reset role;
update private.hangout_chat_feature_gate set enabled=false;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'chat gate revokes reads');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(1),'Hello')$$,'42501',null,'chat gate revokes retry');
reset role;
update private.hangout_chat_feature_gate set enabled=true;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"51300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.set_hangout_joining(pg_temp.hid(),1,'closed'),2::bigint,'host closes joining');
select is((select count(*) from public.read_hangout_messages(pg_temp.hid())),50::bigint,'closed joining retains chat');
select is(public.cancel_hangout(pg_temp.hid(),2),3::bigint,'host cancels');
select throws_ok($$select public.read_hangout_messages(pg_temp.hid())$$,'42501',null,'cancel revokes host');
select throws_ok($$select public.send_hangout_message(pg_temp.hid(),pg_temp.key(3),'No')$$,'42501',null,'cancel denies send');
reset role;
select is((select count(*) from private.hangout_messages),55::bigint,'cancel retains private messages');
select is((select count(*) from private.hangout_message_requests),55::bigint,'cancel retains creation ledger');
select * from finish();
rollback;

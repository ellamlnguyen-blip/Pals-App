-- TASK-034C additive 01000 rate policy. Run after the applied 00800 migration
-- on a named disposable local database; this transaction leaves no fixture.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
update private.pilot_availability set enabled=true where singleton;
update private.pilot_capabilities set enabled=true where key in ('onboarding','dm');
update private.dm_feature_gate set enabled=true where singleton;
insert into auth.users(id,email,email_confirmed_at) values
 ('534c1000-0000-4000-8000-000000000001','attention-rate-1@unc.edu',now()),
 ('534c1000-0000-4000-8000-000000000002','attention-rate-2@unc.edu',now());
select ok(not has_table_privilege('authenticated','private.chat_attention_snapshots','SELECT')
 and not has_table_privilege('authenticated','private.chat_attention_snapshots','UPDATE'),
 'private rate state has no client table grant');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"534c1000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(jsonb_array_length(public.list_my_chat_attention()->'items'),0,
 'first authorized empty inbox creates a private snapshot');
select is(jsonb_array_length(public.list_my_chat_attention()->'items'),0,
 'immediate duplicate first page reuses snapshot');
reset role;
select is((select rate_creation_count from private.chat_attention_snapshots
 where owner_id='534c1000-0000-4000-8000-000000000001'),1,
 'first and duplicate first pages consumed one creation slot');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"534c1000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $rate$
begin
 for i in 1..11 loop
  perform pg_sleep(0.15);
  perform public.list_my_chat_attention();
 end loop;
end $rate$;
select pg_sleep(0.15);
select throws_ok($$select public.list_my_chat_attention()$$,'42501',null,
 'thirteenth snapshot creation in one minute is denied generically');
reset role;
select is((select rate_creation_count from private.chat_attention_snapshots
 where owner_id='534c1000-0000-4000-8000-000000000001'),12,
 'denied attempt leaves the bounded private counter at twelve');
-- Only a disposable privileged fixture advances the server-owned window.
update private.chat_attention_snapshots set rate_window_started_at=clock_timestamp()-interval '61 seconds'
 where owner_id='534c1000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"534c1000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(jsonb_array_length(public.list_my_chat_attention()->'items'),0,
 'new server window permits a fresh snapshot');
reset role;
select is((select rate_creation_count from private.chat_attention_snapshots
 where owner_id='534c1000-0000-4000-8000-000000000001'),1,
 'new window resets counter to one');
set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"534c1000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(jsonb_array_length(public.list_my_chat_attention()->'items'),0,
 'second owner has an independent creation budget');
reset role;
select is((select rate_creation_count from private.chat_attention_snapshots
 where owner_id='534c1000-0000-4000-8000-000000000002'),1,
 'second owner persisted counter starts at one');
-- Exercise the additive DDL replay shape without replacing the live RPC in
-- this pgTAP transaction. Coordinator separately replays all of 01000.
alter table private.chat_attention_snapshots
 add column if not exists rate_window_started_at timestamptz;
alter table private.chat_attention_snapshots
 add column if not exists rate_creation_count integer check(rate_creation_count between 1 and 12);
select is((select rate_creation_count from private.chat_attention_snapshots
 where owner_id='534c1000-0000-4000-8000-000000000002'),1,
 'replayed additive column DDL preserves existing private rate state');
select * from finish();
rollback;

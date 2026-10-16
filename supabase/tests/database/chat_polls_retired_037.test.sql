-- TASK-037: authenticated callers cannot reach retained poll RPCs.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(not has_function_privilege('authenticated','public.create_chat_poll(text,uuid,uuid,uuid,text,text[])','EXECUTE'), 'create denied');
select ok(not has_function_privilege('authenticated','public.vote_chat_poll(text,uuid,uuid,uuid,uuid,uuid)','EXECUTE'), 'vote denied');
select ok(not has_function_privilege('authenticated','public.close_chat_poll(text,uuid,uuid,uuid,uuid)','EXECUTE'), 'close denied');
select ok(not has_function_privilege('authenticated','public.list_chat_polls(text,uuid,uuid,timestamptz,uuid,integer)','EXECUTE'), 'list denied');
select ok(to_regclass('private.chat_polls') is not null and to_regclass('private.chat_poll_options') is not null
 and to_regclass('private.chat_poll_votes') is not null and to_regclass('private.chat_poll_retries') is not null,
 'retained private poll records still exist');
set local role authenticated;
select throws_ok($$select public.create_chat_poll('hangout','11111111-1111-4111-8111-111111111111'::uuid,null,
 '22222222-2222-4222-8222-222222222222'::uuid,'Question?',array['A','B'])$$,
 '42501',null,'authenticated poll creation denied at SQL boundary');
select throws_ok($$select public.vote_chat_poll('hangout','11111111-1111-4111-8111-111111111111'::uuid,null,
 '22222222-2222-4222-8222-222222222222'::uuid,'33333333-3333-4333-8333-333333333333'::uuid,
 '44444444-4444-4444-8444-444444444444'::uuid)$$,
 '42501',null,'authenticated poll voting denied at SQL boundary');
select throws_ok($$select public.close_chat_poll('hangout','11111111-1111-4111-8111-111111111111'::uuid,null,
 '22222222-2222-4222-8222-222222222222'::uuid,'44444444-4444-4444-8444-444444444444'::uuid)$$,
 '42501',null,'authenticated poll close denied at SQL boundary');
select throws_ok($$select public.list_chat_polls('hangout','11111111-1111-4111-8111-111111111111'::uuid,null)$$,
 '42501',null,'authenticated poll read denied at SQL boundary');
select * from finish();
rollback;

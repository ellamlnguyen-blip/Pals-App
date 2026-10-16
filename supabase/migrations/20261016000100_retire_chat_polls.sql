-- TASK-037: retire the student poll surface without deleting retained evidence.
begin;
revoke execute on function public.create_chat_poll(text,uuid,uuid,uuid,text,text[]),
 public.vote_chat_poll(text,uuid,uuid,uuid,uuid,uuid),
 public.close_chat_poll(text,uuid,uuid,uuid,uuid),
 public.list_chat_polls(text,uuid,uuid,timestamptz,uuid,integer)
 from authenticated;
commit;

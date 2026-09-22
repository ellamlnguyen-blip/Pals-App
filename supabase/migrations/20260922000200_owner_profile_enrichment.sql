-- Accepted ADR-0011. Owner profile grants/readiness distinctions are unchanged.
begin;
-- Match JavaScript String.trim whitespace for the optional-field contract.
create function private.profile_trim(value text) returns text
language sql immutable set search_path = '' as $$
 select btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
$$;
revoke all on function private.profile_trim(text) from public,anon,authenticated;
grant execute on function private.profile_trim(text) to authenticated;
create function private.valid_profile_list(items text[], maximum integer, item_limit integer) returns boolean
language sql immutable set search_path = '' as $$
 select coalesce(array_ndims(items),1)=1 and coalesce(array_lower(items,1),1)=1
   and cardinality(items)<=maximum
   and not exists(select 1 from unnest(items) v where v is null or v<>private.profile_trim(v) or length(v) not between 1 and item_limit)
   and cardinality(items)=(select count(distinct v) from unnest(items) v);
$$;
create function private.valid_profile_prompts(items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
 if jsonb_typeof(items)<>'array' then return false; end if;
 if jsonb_array_length(items)>3 then return false; end if;
 for item in select value from jsonb_array_elements(items) loop
   if jsonb_typeof(item)<>'object' then return false; end if;
   if (select count(*) from jsonb_object_keys(item))<>2
      or not item ?& array['question','answer']
      or jsonb_typeof(item->'question')<>'string' or jsonb_typeof(item->'answer')<>'string'
      or length(private.profile_trim(item->>'question')) not between 1 and 120
      or length(private.profile_trim(item->>'answer')) not between 1 and 500
      or item->>'question'<>private.profile_trim(item->>'question') or item->>'answer'<>private.profile_trim(item->>'answer') then return false; end if;
 end loop;
 return true;
end;
$$;
revoke all on function private.valid_profile_list(text[],integer,integer), private.valid_profile_prompts(jsonb) from public, anon, authenticated;
grant execute on function private.valid_profile_list(text[],integer,integer), private.valid_profile_prompts(jsonb) to authenticated;
alter table public.profiles
 add column interests text[] not null default '{}' check(private.valid_profile_list(interests,10,80)),
 add column down_to_do text[] not null default '{}' check(private.valid_profile_list(down_to_do,10,80)),
 add column favorite_music text check(favorite_music is null or (favorite_music=private.profile_trim(favorite_music) and length(favorite_music) between 1 and 500)),
 add column favorite_foods text check(favorite_foods is null or (favorite_foods=private.profile_trim(favorite_foods) and length(favorite_foods) between 1 and 500)),
 add column weird_fact text check(weird_fact is null or (weird_fact=private.profile_trim(weird_fact) and length(weird_fact) between 1 and 500)),
 add column prompts jsonb not null default '[]' check(private.valid_profile_prompts(prompts)),
 add column instagram text check(instagram is null or instagram ~ '^[A-Za-z0-9_.]{1,30}$'),
 add column additional_photo_paths text[] not null default '{}' check(private.valid_profile_list(additional_photo_paths,4,1024)),
 add column revision bigint not null default 0,
 add constraint distinct_primary_extra check(primary_photo_path is null or not primary_photo_path=any(additional_photo_paths));
grant update(interests,down_to_do,favorite_music,favorite_foods,weird_fact,prompts,instagram,additional_photo_paths) on public.profiles to authenticated;

create function private.bump_profile_revision() returns trigger
language plpgsql set search_path = '' as $$
begin new.revision=old.revision+1; return new; end;
$$;
revoke all on function private.bump_profile_revision() from public,anon,authenticated;
create trigger bump_profile_revision before update on public.profiles for each row execute function private.bump_profile_revision();

drop trigger validate_primary_photo on public.profiles;
drop function private.validate_primary_photo();
create function private.validate_profile_photos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare path text;
begin
 -- A KEY SHARE lock lasts through commit. A concurrent delete either waits,
 -- fails serialization at stronger isolation, or deadlocks and aborts safely.
 for path in select unnest(array_remove(array_prepend(new.primary_photo_path,new.additional_photo_paths),null)) order by 1 loop
   perform 1 from storage.objects o where o.bucket_id='profile-photos' and o.name=path
     and o.owner_id=new.user_id::text and split_part(o.name,'/',1)=new.user_id::text for key share;
   if not found then raise exception 'Photos must be existing owned private objects' using errcode='23514'; end if;
 end loop;
 return new;
end;
$$;
revoke all on function private.validate_profile_photos() from public,anon,authenticated;
create trigger validate_profile_photos before insert or update of primary_photo_path,additional_photo_paths on public.profiles
for each row execute function private.validate_profile_photos();

create function private.protect_profile_photo_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
declare profile public.profiles;
begin
 if old.bucket_id='profile-photos' then
   -- RLS NOT EXISTS alone has a stale statement snapshot race. Lock the profile
   -- and examine the returned current tuple, not a pre-lock snapshot. A newer
   -- tuple at REPEATABLE READ aborts. Lock inversion may abort, never orphan.
   select * into profile from public.profiles where user_id::text=old.owner_id for update;
   if found and (profile.primary_photo_path=old.name or old.name=any(profile.additional_photo_paths)) then
     raise exception 'Detach a profile photo before deleting it' using errcode='23514';
   end if;
 end if;
 return old;
end;
$$;
revoke all on function private.protect_profile_photo_delete() from public,anon,authenticated;
create trigger pals_protect_profile_photo_delete before delete on storage.objects
for each row execute function private.protect_profile_photo_delete();
drop policy profile_photos_owner_delete on storage.objects;
create policy profile_photos_owner_delete on storage.objects for delete to authenticated
using(bucket_id='profile-photos' and owner_id=(select auth.uid())::text
 and (select private.has_verified_membership())
 and not exists(select 1 from public.profiles p where p.user_id=(select auth.uid())
   and (p.primary_photo_path=name or name=any(p.additional_photo_paths))));
commit;

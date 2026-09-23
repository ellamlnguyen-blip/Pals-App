-- ADR-0013: derive the browse cursor sort key from the returned raw name in Postgres.
begin;

create or replace function public.browse_people(
  p_search text default null, p_graduation_year integer default null,
  p_major text default null, p_after_name text default null,
  p_after_id uuid default null, p_limit integer default 24
) returns table(account_id uuid, real_name text, campus_name text,
  graduation_year integer, major text)
language plpgsql volatile security definer set search_path = '' as $$
declare campus uuid;
declare query_text text := nullif(pg_catalog.btrim(p_search), '');
declare major_text text := nullif(pg_catalog.btrim(p_major), '');
declare cursor_name text;
begin
  perform private.people_require_read_committed();
  if p_limit is null or p_limit not between 1 and 24
    or (p_search is not null and pg_catalog.length(p_search) > 100)
    or (p_major is not null and pg_catalog.length(p_major) > 200)
    or (p_graduation_year is not null and p_graduation_year not between 1900 and 2200)
    or ((p_after_name is null) <> (p_after_id is null))
    or (p_after_name is not null and
       (pg_catalog.length(p_after_name) not between 1 and 100
        or pg_catalog.btrim(p_after_name) = '')) then
    raise exception 'Invalid People browse input' using errcode = '22023';
  end if;
  cursor_name := pg_catalog.lower(pg_catalog.btrim(p_after_name));
  if not private.people_enabled() then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  campus := private.people_ready_campus();
  if campus is null then
    raise exception 'People operation unavailable' using errcode = '42501';
  end if;
  return query
    select p.user_id, p.real_name, c.name, p.graduation_year, p.major
    from public.profiles p
    join public.university_memberships m on m.user_id = p.user_id and m.university_id = campus
    join public.universities c on c.id = m.university_id
    where private.people_visible(p.user_id, campus)
      and (query_text is null or pg_catalog.strpos(pg_catalog.lower(p.real_name), pg_catalog.lower(query_text)) > 0)
      and (p_graduation_year is null or p.graduation_year = p_graduation_year)
      and (major_text is null or pg_catalog.lower(p.major) = pg_catalog.lower(major_text))
      and (p_after_id is null or
        ((pg_catalog.lower(pg_catalog.btrim(p.real_name)) collate "C"), p.user_id) >
        ((cursor_name collate "C"), p_after_id))
    order by pg_catalog.lower(pg_catalog.btrim(p.real_name)) collate "C", p.user_id
    limit p_limit;
end;
$$;


commit;

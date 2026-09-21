-- Local-only reference fixture. No real users or production eligibility allowlist.
insert into public.universities (id, slug, name, active)
values ('00000000-0000-4000-8000-000000000001', 'unc-chapel-hill', 'University of North Carolina at Chapel Hill', true)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, active = excluded.active;

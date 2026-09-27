import assert from "node:assert/strict";
import { localTarget, sql } from "./pilot-admission-authority.mjs";

localTarget();
const counts = {};
for (const table of [
  "auth.users",
  "public.accounts",
  "public.profiles",
  "public.university_memberships",
  "public.platform_roles",
  "public.hangouts",
  "public.hangout_participants",
  "storage.objects",
  "private.pilot_account_admission",
  "private.pilot_admission_managers",
  "private.pilot_management_audit",
  "private.pilot_management_requests",
  "private.pilot_manager_audit",
]) {
  const count = Number(sql(`select count(*) from ${table}`));
  assert.equal(count, 0, `${table}: no synthetic rows remain`);
  counts[table] = count;
}
assert.equal(
  sql(
    "select enabled||':'||revision from private.pilot_availability where singleton",
  ),
  "false:1",
);
assert.equal(
  sql(
    "select count(*) from private.pilot_capabilities where not enabled and revision=1",
  ),
  "13",
);
sql(`do $$declare t record; n bigint; live boolean; begin
 for t in select table_name from information_schema.tables where table_schema='private' and table_type='BASE TABLE' loop
  if t.table_name like '%feature_gate' then
   execute format('select coalesce(bool_or(enabled),false) from private.%I',t.table_name) into live;
   if live then raise exception 'Unexpected enabled original feature gate: %',t.table_name; end if;
  elsif t.table_name not in ('pilot_availability','pilot_capabilities') then
   execute format('select count(*) from private.%I',t.table_name) into n;
   if n<>0 then raise exception 'Unexpected retained synthetic rows: %',t.table_name; end if;
  end if;
 end loop;
end $$;`);
console.log(JSON.stringify(counts));
console.log(
  "Availability false:revision1; all13 capabilities false:revision1; all original feature gates off; all nonconfig private evidence empty",
);

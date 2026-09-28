import assert from "node:assert/strict";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  localTarget,
  sql,
  quote,
  resetDisposable,
  expectedMigrationVersions,
} from "./pilot-admission-cohost-chat.mjs";
localTarget("prior25-upgrade");
const prior = expectedMigrationVersions.slice(0, 25);
const sourceName = "20260927000600_pilot_cohost_chat.sql";
assert.deepEqual(
  readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => f.split("_")[0]),
  expectedMigrationVersions,
  "reviewed exact source26 manifest",
);
const shape = () =>
  JSON.parse(
    sql(
      `select jsonb_build_object('tables',(select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in('public','private') or (n.nspname='storage' and c.relname='objects'))),'policies',(select jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname) from pg_policies p where schemaname in('public','private','storage')),'constraints',(select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid,c.conname) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in('public','private','storage')),'triggers',(select jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'function',t.tgfoid::regprocedure::text,'definition',pg_get_triggerdef(t.oid)) order by t.tgrelid,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in('public','private','storage')),'default_acl',(select jsonb_agg(to_jsonb(a) order by oid) from pg_default_acl a))`,
    ),
  );
const functions = () =>
  JSON.parse(
    sql(
      `select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||p.proname,'args',pg_get_function_identity_arguments(p.oid),'default_args',pg_get_function_arguments(p.oid),'result',pg_get_function_result(p.oid),'acl',p.proacl,'owner',pg_get_userbyid(p.proowner),'volatility',p.provolatile,'security_definer',p.prosecdef,'config',p.proconfig,'body',p.prosrc) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private')`,
    ),
  );
try {
  execFileSync(
    process.env.SUPABASE_CLI ?? "supabase",
    [
      "db",
      "reset",
      "--local",
      "--network-id",
      "pals-local-network",
      "--version",
      "20260927000500",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  localTarget("prior25-upgrade");
  assert.deepEqual(
    sql(
      "select version from supabase_migrations.schema_migrations order by version",
    ).split("\n"),
    prior,
    "true25 initial manifest",
  );
  const id = "b3b00000-0000-4000-8099-000000000001",
    peer = "b3b00000-0000-4000-8099-000000000002",
    source = "b3b00000-0000-4000-8199-000000000001";
  sql(
    `begin;insert into auth.users(id,email,email_confirmed_at) values('${id}','b3b-upgrade-host@unc.edu',now()),('${peer}','b3b-upgrade-peer@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${id}/11111111.png','${id}'),('profile-photos','${peer}/11111111.png','${peer}');update public.profiles set real_name='Retained fixture',bio='Retained',major='Math',graduation_year=2028,favorite_music='Retained optional',primary_photo_path=user_id::text||'/11111111.png';insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude) values('${source}','${id}','00000000-0000-4000-8000-000000000001','Retained source',now()+interval '1 day','Approximate',35.91,-79.05);insert into public.hangout_participants(hangout_id,account_id,state) values('${source}','${id}','joined'),('${source}','${peer}','joined');insert into private.hangout_cohosts(hangout_id,account_id) values('${source}','${peer}');insert into public.hangout_private_locations(hangout_id,instructions) values('${source}','Retained private');with c as(insert into private.hangout_conversations(hangout_id,next_sequence) values('${source}',2) returning id) insert into private.hangout_messages(conversation_id,author_id,sequence,body) select id,'${peer}',1,'Retained message' from c;insert into private.hangout_message_requests(hangout_id,author_id,request_id,message_id,payload_fingerprint) select '${source}','${peer}',gen_random_uuid(),id,encode(sha256(convert_to(body,'UTF8')),'hex') from private.hangout_messages;insert into private.safety_reports(reporter_id,target_type,target_id,category,provenance_kind,provenance_ref_id) values('${peer}','hangout','${source}','harassment','retained_hangout','${source}');commit;`,
  );
  const tables = sql(
    "select table_schema||'.'||table_name from information_schema.tables where table_type='BASE TABLE' and (table_schema in('public','private') or (table_schema='storage' and table_name='objects') or (table_schema='auth' and table_name='users')) order by table_schema,table_name",
  ).split("\n");
  const values = () =>
    tables.map((t) => [
      t,
      sql(
        `select coalesce(jsonb_agg(v order by v::text),'[]') from(select to_jsonb(t) v from ${t} t) rows`,
      ),
    ]);
  const retained = values(),
    catalog = shape(),
    before = functions();
  const migration = readFileSync("supabase/migrations/" + sourceName, "utf8");
  const body = migration.replace(/^begin;$/m, "").replace(/\ncommit;\s*$/, "");
  // The reviewed streamed migration and its history receipt are one transaction;
  // existing25 history values are retained and exactly26 is registered.
  sql(
    `begin;${body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('20260927000600','pilot_cohost_chat',array[${quote(migration)}]);commit;`,
  );
  localTarget("current26");
  assert.deepEqual(
    shape(),
    catalog,
    "exact columns/types/defaults/ACL/RLS/policies/constraints/trigger function bindings/defaultACL unchanged",
  );
  assert.deepEqual(
    values(),
    retained,
    "every public/private/Auth/Storage retained value unchanged",
  );
  const after = functions();
  const replaced = new Set([
    "public.remove_hangout_participant",
    "public.promote_hangout_cohost",
    "public.demote_hangout_cohost",
    "public.step_down_hangout_cohost",
    "public.send_hangout_message",
  ]);
  for (const f of before) {
    const now = after.find((n) => n.name === f.name && n.args === f.args);
    assert.ok(now);
    for (const field of Object.keys(f).filter((k) => k !== "body"))
      assert.deepEqual(now[field], f[field], f.name + " " + field);
    if (!replaced.has(f.name))
      assert.equal(now.body, f.body, f.name + " exact untouched body");
  }
  assert.equal(after.length, before.length + 2);
  assert.equal(
    after.filter(
      (f) => !before.some((b) => b.name === f.name && b.args === f.args),
    ).length,
    2,
  );
  assert.equal(
    sql("select enabled||':'||revision from private.pilot_availability"),
    "false:1",
  );
  assert.equal(
    sql(
      "select count(*) from private.pilot_capabilities where not enabled and revision=1",
    ),
    "13",
  );
  writeFileSync(
    "agents/handoffs/TASK-021A1b3b-UPGRADE-EVIDENCE.json",
    JSON.stringify(
      {
        prior_manifest: prior,
        final_manifest: expectedMigrationVersions,
        retained_tables: tables,
        prior_function_count: before.length,
        final_function_count: after.length,
        catalog,
        classification:
          "true25→only26 streamed migration with atomic new history receipt; every prior value and unchanged ABI/catalog/body preserved",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  resetDisposable("prior25-upgrade");
}

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { localTarget, sql } from "./pilot-admission-lifecycle.mjs";
localTarget();
const assertTap = (output, label) => {
  assert.doesNotMatch(output, /^not ok\b/m, label);
  assert.doesNotMatch(output, /#\s*(SKIP|TODO)\b/i, label + " no hidden skips");
  const plans = [...output.matchAll(/^1\.\.(\d+)$/gm)];
  assert.equal(plans.length, 1, label + " exactly one completed plan");
  const count = (output.match(/^ok\s+\d+/gm) ?? []).length;
  assert.ok(count > 0, label + " actual assertions");
  assert.equal(count, Number(plans[0][1]), label + " full plan completed");
};
const catalogShape = () =>
  sql(
    `select jsonb_build_object('tables',(select jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'acl',c.relacl,'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in('public','private') or (n.nspname='storage' and c.relname='objects'))),'policies',(select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_policies p where p.schemaname in('public','private','storage')),'constraints',(select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid,c.conname) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in('public','private','storage')),'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgrelid,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in('public','private','storage')),'default_acl',(select jsonb_agg(to_jsonb(a) order by oid) from pg_default_acl a))`,
  );
const mode = process.argv[2] ?? "suite";
const reset = (prior = false) => {
  const r = spawnSync(
    process.env.SUPABASE_CLI ?? "supabase",
    [
      "db",
      "reset",
      "--local",
      "--network-id",
      "pals-local-network",
      ...(prior ? ["--version", "20260927000400"] : []),
    ],
    { encoding: "utf8" },
  );
  for (const line of (r.stdout + "\n" + r.stderr).split("\n"))
    if (/Applying migration|Finished|Error|failed|ERROR/.test(line))
      console.log(line.slice(0, 800));
  assert.equal(r.status, 0, "owned guarded reset must succeed");
};
if (mode === "reset") {
  reset();
} else if (mode === "upgrade") {
  reset(true);
  const files = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const prior = files
    .filter((f) => f < "20260927000500_pilot_ordinary_lifecycle.sql")
    .map((f) => f.split("_")[0]);
  assert.equal(prior.length, 24);
  assert.deepEqual(
    sql(
      "select version from supabase_migrations.schema_migrations order by version",
    ).split("\n"),
    prior,
  );
  const id = "c2000000-0000-4000-8000-000000000001";
  sql(
    `insert into auth.users(id,email,email_confirmed_at) values('${id}','prior-source-b2@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${id}/11111111.png','${id}');update public.profiles set real_name='Prior retained',graduation_year=2028,major='Math',bio='Retained',favorite_music='Retained optional',primary_photo_path='${id}/11111111.png' where user_id='${id}';`,
  );
  const source = "c2000000-0000-4000-8001-000000000001";
  sql(
    `insert into public.hangouts(id,host_id,university_id,title,starts_at,public_place,public_latitude,public_longitude) values('${source}','${id}','00000000-0000-4000-8000-000000000001','Retained source',now()+interval '1 day','Approximate',35.91,-79.05);insert into public.hangout_participants(hangout_id,account_id,state) values('${source}','${id}','joined');insert into public.hangout_private_locations(hangout_id,instructions) values('${source}','Retained private fixture');insert into private.safety_reports(reporter_id,target_type,target_id,category,provenance_kind,provenance_ref_id) values('${id}','hangout','${source}','harassment','retained_hangout','${source}');`,
  );
  const tables = sql(
    "select table_schema||'.'||table_name from information_schema.tables where table_type='BASE TABLE' and (table_schema='private' or (table_schema='public' and table_name in ('accounts','profiles','university_memberships','hangouts','hangout_participants','hangout_private_locations'))) order by table_schema,table_name",
  ).split("\n");
  const values = () =>
    tables.map((table) => [
      table,
      sql(
        `select coalesce(jsonb_agg(v order by v::text),'[]') from (select to_jsonb(t) v from ${table} t) rows`,
      ),
    ]);
  const retainedBefore = values();
  const priorCatalog = catalogShape();
  const before = sql(
    `select row_to_json(p) from public.profiles p where user_id='${id}'`,
  );
  const storageBefore = sql("select jsonb_agg(o) from storage.objects o");
  sql(
    readFileSync(
      "supabase/migrations/20260927000500_pilot_ordinary_lifecycle.sql",
      "utf8",
    ),
  );
  assert.equal(
    catalogShape(),
    priorCatalog,
    "exact24→25 fields/types/defaults/ACL/RLS/policies/constraints/triggers/default ACL preserved",
  );
  assert.deepEqual(
    values(),
    retainedBefore,
    "true24→25 preserves every retained source/private/safety/policy value",
  );
  assert.equal(
    sql(`select row_to_json(p) from public.profiles p where user_id='${id}'`),
    before,
  );
  assert.equal(
    sql("select jsonb_agg(o) from storage.objects o"),
    storageBefore,
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
  assert.deepEqual(
    sql(
      "select version from supabase_migrations.schema_migrations order by version",
    ).split("\n"),
    prior,
  );
  console.log(
    "Prior24→only lifecycle migration upgrade retained profile/optional/object and defaults unchanged",
  );
  reset();
} else if (mode === "clean") {
  for (const t of [
    "auth.users",
    "public.accounts",
    "public.profiles",
    "public.university_memberships",
    "public.platform_roles",
    "public.hangouts",
    "public.hangout_participants",
    "storage.objects",
  ])
    assert.equal(sql(`select count(*) from ${t}`), "0", t);
  sql(
    `do $$declare t record;n bigint;live boolean;begin for t in select table_name from information_schema.tables where table_schema='private' and table_type='BASE TABLE' loop if t.table_name like '%feature_gate' then execute format('select coalesce(bool_or(enabled),false) from private.%I',t.table_name) into live;if live then raise exception 'Enabled original gate %',t.table_name;end if;elsif t.table_name not in ('pilot_availability','pilot_capabilities') then execute format('select count(*) from private.%I',t.table_name) into n;if n<>0 then raise exception 'Retained fixtures %',t.table_name;end if;end if;end loop;end;$$`,
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
  console.log(
    "Empty synthetic census; all pilot/original gates off; availability/capability revision1",
  );
} else if (mode === "suite") {
  const setup = `insert into private.pilot_account_admission(account_id,state,revision) select id,'active',1 from public.accounts;update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key in('onboarding','hangouts','hangout_chat','people');`;
  for (const file of [
    "identity_rls.test.sql",
    "onboarding.test.sql",
    "profile_enrichment.test.sql",
    "local_account_enforcement.test.sql",
    "private_pilot_admission_authority.test.sql",
    "hangout_foundation.test.sql",
    "local_global_blocks.test.sql",
    "local_hangout_chat.test.sql",
    "local_safety_reports.test.sql",
    "local_moderation_review.test.sql",
    "local_hangout_disable.test.sql",
    "local_cohost_authority.test.sql",
    "local_large_hangout_safeguards.test.sql",
  ]) {
    let input = readFileSync(`supabase/tests/database/${file}`, "utf8");
    if (file !== "private_pilot_admission_authority.test.sql")
      input = input.replace(
        /set local role (anon|authenticated);/,
        `${setup}\n$&`,
      );
    if (file === "identity_rls.test.sql") {
      input = input.replace(
        "2::bigint, 'active university reference rows readable; inactive campus hidden'",
        "1::bigint, 'B1 only current own campus reference readable'",
      );
      input = input.replace(
        "1::bigint, 'unconfirmed account may read its own onboarding draft'",
        "0::bigint, 'B1 unconfirmed own draft denied'",
      );
      input = input.replace(
        "select lives_ok($$update public.profiles set real_name='Draft Student', graduation_year=2027, major='Math', bio='Fixture'$$, 'unverified user may edit own draft');",
        "with changed as(update public.profiles set real_name='Draft Student' returning *) select is(count(*),0::bigint,'B1 unverified draft update denied') from changed;",
      );
      input = input.replace(
        "select is((select status from public.accounts), 'suspended', 'suspended account may read own restriction');",
        "select is(public.get_access_state(),'restricted','B1 restriction uses caller status only');",
      );
    }
    if (file === "profile_enrichment.test.sql")
      input = input.replace(
        "select lives_ok($$update profiles set interests=array['Draft']$$,'unverified active-owner draft semantics preserved');",
        "with changed as(update profiles set interests=array['Draft'] returning *) select is(count(*),0::bigint,'B1 unverified owner writes denied') from changed;",
      );
    if (file === "profile_enrichment.test.sql") {
      const marker =
        '{"sub":"60000000-0000-4000-8000-000000000003","role":"authenticated"}';
      const last = input.lastIndexOf(marker);
      assert.ok(last >= 0);
      input =
        input.slice(0, last) +
        input
          .slice(last)
          .replace(
            marker,
            '{"sub":"60000000-0000-4000-8000-000000000002","role":"authenticated"}',
          );
    }
    if (file === "local_large_hangout_safeguards.test.sql")
      input = input.replace(
        "select is(jsonb_array_length(pg_temp.saved()->'pins'),0,\n  'ready different-campus viewer sees no UNC Hangouts');",
        () =>
          "select throws_ok($$select pg_temp.saved()$$,'42501','Saved Hangouts unavailable','B1 nonUNC campus denies source readiness');",
      );
    if (file === "hangout_foundation.test.sql")
      input = input.replace(
        "1::bigint,'public roster hides no-longer-ready host'",
        "0::bigint,'B2 unready immutable host hides whole roster'",
      );
    const output = sql(input);
    assertTap(output, file);
    console.log(
      `${file}: ${(output.match(/^ok\s+\d+/gm) ?? []).length} stage-adapted assertions pass`,
    );
  }
  const output = sql(
    readFileSync(
      "supabase/tests/pilot-admission-source-safety.test.sql",
      "utf8",
    ),
  );
  assertTap(output, "source safety");
  console.log(
    `pilot-admission-source-safety.test.sql: ${(output.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
  const mandatory = sql(
    readFileSync(
      "supabase/tests/pilot-moderation-lock-results.test.sql",
      "utf8",
    ),
  );
  assertTap(mandatory, "operator mandatory locks");
  console.log(
    `mandatory operator lock results: ${(mandatory.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
  const owner = sql(
    readFileSync("supabase/tests/pilot-admission-owner.test.sql", "utf8"),
  );
  assertTap(owner, "B1 owner");
  console.log(
    `B1 owner: ${(owner.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
  const lifecycle = sql(
    readFileSync("supabase/tests/pilot-admission-lifecycle.test.sql", "utf8"),
  );
  assertTap(lifecycle, "B3a lifecycle");
  console.log(
    `Lifecycle: ${(lifecycle.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
} else throw new Error("only suite/reset/upgrade/clean modes permitted");

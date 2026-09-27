import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { localTarget, sql } from "./pilot-admission-owner.mjs";
localTarget();
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
      ...(prior ? ["--version", "20260927000100"] : []),
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
    .filter((f) => f < "20260927000200_pilot_owner_admission.sql")
    .map((f) => f.split("_")[0]);
  assert.equal(prior.length, 21);
  assert.deepEqual(
    sql(
      "select version from supabase_migrations.schema_migrations order by version",
    ).split("\n"),
    prior,
  );
  const id = "c1000000-0000-4000-8000-000000000001";
  sql(
    `insert into auth.users(id,email,email_confirmed_at) values('${id}','prior-owner-b1@unc.edu',now());insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${id}/11111111.png','${id}');update public.profiles set real_name='Prior retained',graduation_year=2028,major='Math',bio='Retained',favorite_music='Retained optional',primary_photo_path='${id}/11111111.png' where user_id='${id}'`,
  );
  assert.equal(
    sql(
      `begin;set local role authenticated;set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';select public.get_access_state();rollback;`,
    ),
    "ready",
  );
  sql(
    readFileSync(
      "supabase/migrations/20260927000200_pilot_owner_admission.sql",
      "utf8",
    ),
  );
  assert.equal(
    sql(
      `begin;set local role authenticated;set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';select public.get_access_state();rollback;`,
    ),
    "pilot_unavailable",
  );
  assert.equal(
    sql(
      `select real_name||':'||favorite_music from public.profiles where user_id='${id}'`,
    ),
    "Prior retained:Retained optional",
  );
  assert.equal(sql("select count(*) from storage.objects"), "1");
  assert.equal(
    sql("select count(*) from private.pilot_account_admission"),
    "0",
  );
  assert.deepEqual(
    sql(
      "select version from supabase_migrations.schema_migrations order by version",
    ).split("\n"),
    prior,
  );
  console.log(
    "True prior21 history preserved; only B1 applied; retained required/optional/owned object unchanged; off denies",
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
  const setup = `insert into private.pilot_account_admission(account_id,state,revision) select id,'active',1 from public.accounts;update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key='onboarding';`;
  for (const file of [
    "identity_rls.test.sql",
    "onboarding.test.sql",
    "profile_enrichment.test.sql",
    "local_account_enforcement.test.sql",
    "private_pilot_admission_authority.test.sql",
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
    const output = sql(input);
    assert.doesNotMatch(output, /^not ok\b/m, file);
    console.log(
      `${file}: ${(output.match(/^ok\s+\d+/gm) ?? []).length} stage-adapted assertions pass`,
    );
  }
  const output = sql(
    readFileSync("supabase/tests/pilot-admission-owner.test.sql", "utf8"),
  );
  assert.doesNotMatch(output, /^not ok\b/m);
  console.log(
    `pilot-admission-owner.test.sql: ${(output.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
} else throw new Error("only suite/reset/upgrade/clean modes permitted");

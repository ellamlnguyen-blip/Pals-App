import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { localTarget, sql } from "./helpers/pilot-admission-authority.mjs";

test(
  "apply only admission migration to genuine prior schema without rewriting/replaying history",
  { concurrency: false, timeout: 120_000 },
  () => {
    localTarget();
    assert.equal(
      sql("select to_regclass('private.pilot_account_admission') is null"),
      "t",
      "runner must guarded-reset through 20260925000200 first",
    );
    const actor = crypto.randomUUID();
    const peer = crypto.randomUUID();
    const report = crypto.randomUUID();
    const existingDefinition = sql(
      "select md5(pg_get_functiondef('public.get_access_state()'::regprocedure))",
    );
    const history = sql(
      "select string_agg(version,',' order by version) from supabase_migrations.schema_migrations",
    );
    assert.equal(
      history.split(",").length,
      20,
      "exact preceding twenty migrations applied",
    );
    const expectedHistory = readdirSync(
      new URL("../migrations/", import.meta.url),
    )
      .filter((name) => name.endsWith(".sql") && name < "20260927000100")
      .sort()
      .map((name) => name.split("_")[0]);
    assert.equal(expectedHistory.length, 20);
    assert.deepEqual(
      history.split(","),
      expectedHistory,
      "exact twenty committed prior migration IDs match database history",
    );
    sql(`insert into auth.users(id,email,email_confirmed_at) values('${actor}','pilot-upgrade-${actor}@unc.edu',now()),('${peer}','pilot-upgrade-${peer}@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${actor}/primary.png','${actor}');
    update public.profiles set real_name='Upgrade retained',major='Science',graduation_year=2028,bio='Local retained data',primary_photo_path='${actor}/primary.png',favorite_music='Retained optional' where user_id='${actor}';
    insert into private.people_preferences(account_id,opted_in) values('${actor}',false);
    insert into private.safety_reports(id,reporter_id,target_type,target_id,category,provenance_kind,provenance_ref_id) values('${report}','${actor}','user','${peer}','harassment','current_hangout','${crypto.randomUUID()}');`);
    const profile = sql(
      `select row_to_json(p)::text from public.profiles p where user_id='${actor}'`,
    );
    const retainedReport = sql(
      `select row_to_json(r)::text from private.safety_reports r where id='${report}'`,
    );
    sql(
      readFileSync(
        new URL(
          "../migrations/20260927000100_private_pilot_admission_authority.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal(
      sql(
        `select row_to_json(p)::text from public.profiles p where user_id='${actor}'`,
      ),
      profile,
    );
    assert.equal(
      sql(
        `select row_to_json(r)::text from private.safety_reports r where id='${report}'`,
      ),
      retainedReport,
    );
    assert.equal(
      sql(`select count(*) from storage.objects where owner_id='${actor}'`),
      "1",
    );
    assert.equal(
      sql(
        `select count(*) from private.people_preferences where account_id='${actor}'`,
      ),
      "1",
    );
    assert.equal(
      sql(
        "select md5(pg_get_functiondef('public.get_access_state()'::regprocedure))",
      ),
      existingDefinition,
      "existing student helper byte definition unchanged",
    );
    assert.equal(
      sql(
        "select string_agg(version,',' order by version) from supabase_migrations.schema_migrations",
      ),
      history,
      "only supplied new SQL applied; old migration history unreplayed",
    );
    assert.equal(
      sql("select count(*) from private.pilot_account_admission"),
      "0",
    );
    assert.equal(
      sql("select count(*) from private.pilot_admission_managers"),
      "0",
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
    // Immutable retained report and upgrade fixtures are cleaned by a subsequent
    // guarded full disposable reset; do not erase private evidence ad hoc.
  },
);

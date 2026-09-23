import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// SERIAL, DESTRUCTIVE, DISPOSABLE-LOCAL fixture. Run only with the other local
// database suites stopped. It resets the local database before and after the
// historical upgrade; it never targets a hosted project or edits migrations.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const cli = process.env.SUPABASE_CLI ?? "supabase";
const container = "supabase_db_pals-local";
const migration = "20260923000600_local_global_blocks.sql";
const campus = "00000000-0000-4000-8000-000000000001";
const users = {
  a: "51600000-0000-4000-8000-000000000001",
  b: "51600000-0000-4000-8000-000000000002",
  c: "51600000-0000-4000-8000-000000000003",
  d: "51600000-0000-4000-8000-000000000004",
  e: "51600000-0000-4000-8000-000000000005",
  f: "51600000-0000-4000-8000-000000000006",
  g: "51600000-0000-4000-8000-000000000007",
};
const hangouts = {
  cycle: "51600000-0000-4000-8001-000000000001",
  mutual: "51600000-0000-4000-8001-000000000002",
  cancelled: "51600000-0000-4000-8001-000000000003",
  disjoint: "51600000-0000-4000-8001-000000000004",
};
const psqlArgs = ["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (query) => execFileSync("docker", psqlArgs, { input: query.endsWith(";") ? query : `${query};`, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).trim();
const reset = (cwd) => execFileSync(cli, ["db", "reset", "--local", "--network-id", "pals-local-network"], {
  cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180_000,
});

function assertDisposableTarget() {
  assert.equal(process.env.PALS_ALLOW_DESTRUCTIVE_UPGRADE_TEST, "1",
    "Set PALS_ALLOW_DESTRUCTIVE_UPGRADE_TEST=1 only for an isolated disposable local database");
  const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }));
  assert.equal(status.API_URL, "http://127.0.0.1:54321");
  assert.match(status.DB_URL, /^postgresql?:\/\/postgres:[^@]*@127\.0\.0\.1:54322\/postgres$/);
  assert.equal(sql("select current_database()"), "postgres");
  assert.equal(sql("select count(*) from public.universities where id='00000000-0000-4000-8000-000000000001'"), "1");
}

function seedHistoricalData() {
  const authRows = Object.entries(users).map(([key, id]) =>
    `('${id}','upgrade-${key}@unc.edu',now())`).join(",");
  const h = (id, host, status = "published") =>
    `('${id}','${campus}','${users[host]}','Upgrade fixture',now()+interval '1 day','Campus area',35,-79,'${status}','${status === "cancelled" ? "closed" : "open"}')`;
  const participant = (key, hangout, state = "joined", joined = "now()-interval '1 hour'", departed = null) =>
    `('${hangouts[hangout]}','${users[key]}','${state}',${joined},${state === "left" ? departed : "null"},null)`;
  sql(`begin;
    insert into auth.users(id,email,email_confirmed_at) values ${authRows};
    update public.university_memberships m set university_id='${campus}',
      verified_at=now(),verification_email=u.email
      from auth.users u where u.id=m.user_id and u.id::text like '51600000-%';
    insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,
      public_latitude,public_longitude,status,joining_state) values
      ${h(hangouts.cycle, "a")},${h(hangouts.mutual, "e")},
      ${h(hangouts.cancelled, "a", "cancelled")},${h(hangouts.disjoint, "e")};
    insert into public.hangout_participants(hangout_id,account_id,state,joined_at,left_at,removed_at)
      values ${[
        participant("a", "cycle"),participant("b", "cycle"),participant("c", "cycle"),
        participant("d", "cycle"),participant("e", "cycle"),
        participant("e", "mutual"),participant("b", "mutual"),participant("c", "mutual"),
        participant("a", "cancelled"),participant("b", "cancelled"),participant("e", "cancelled"),
        participant("e", "disjoint"),
        participant("f", "disjoint", "left", "now()-interval '4 hours'", "now()-interval '3 hours'"),
        participant("g", "disjoint", "joined", "now()-interval '2 hours'"),
      ].join(",")};
    insert into private.people_blocks(blocker_id,blocked_id) values
      ('${users.a}','${users.b}'),
      ('${users.b}','${users.c}'),('${users.c}','${users.b}'),
      ('${users.c}','${users.d}'),('${users.d}','${users.c}'),
      ('${users.d}','${users.a}'),('${users.f}','${users.g}');
    insert into private.notification_items(recipient_id,source_kind,source_id,target_id,event_code,actor_id)
      values('${users.e}','friendship','51600000-0000-4000-8002-000000000001',
        '51600000-0000-4000-8002-000000000001','friend_request','${users.a}');
    update private.people_feature_gate set enabled=true;
    update private.friendship_feature_gate set enabled=true;
    update private.dm_feature_gate set enabled=true;
    update private.hangout_feature_gate set enabled=true;
    update private.hangout_chat_feature_gate set enabled=true;
    update private.notification_feature_gate set enabled=true;
    commit;`);
}

function roster(id) {
  return JSON.parse(sql(`select coalesce(jsonb_object_agg(account_id::text,state), '{}'::jsonb)
    from public.hangout_participants where hangout_id='${id}'`));
}
function expected(entries) {
  return Object.fromEntries(entries.map(([key, state]) => [users[key], state]));
}
function provenance(id, left, right) {
  return sql(`select count(*) from private.hangout_peer_provenance
    where hangout_id='${id}' and low_id=least('${users[left]}'::uuid,'${users[right]}'::uuid)
      and high_id=greatest('${users[left]}'::uuid,'${users[right]}'::uuid)`);
}

test("historical blocks reconcile from one original roster before gates reopen", { concurrency: false, timeout: 600_000 }, () => {
  assertDisposableTarget();
  const scratch = mkdtempSync(join(tmpdir(), "pals-global-block-upgrade-"));
  let resetStarted = false;
  try {
    const staged = join(scratch, "supabase");
    mkdirSync(join(staged, "migrations"), { recursive: true });
    mkdirSync(join(staged, "seed"), { recursive: true });
    cpSync(join(root, "supabase/config.toml"), join(staged, "config.toml"));
    cpSync(join(root, "supabase/seed/local.sql"), join(staged, "seed/local.sql"));
    for (const name of readdirSync(join(root, "supabase/migrations"))) {
      if (!name.endsWith(".sql") || name >= migration) continue;
      cpSync(join(root, "supabase/migrations", name), join(staged, "migrations", name));
    }
    assert.ok(readdirSync(join(staged, "migrations")).some((name) => name.startsWith("20260923000500_")));
    assert.ok(!readdirSync(join(staged, "migrations")).includes(migration));

    resetStarted = true;
    reset(scratch); // Schema ends at 20260923000500, with no global safety objects.
    assert.equal(sql("select to_regclass('private.safety_feature_gate') is null"), "t");
    seedHistoricalData();
    assert.deepEqual(roster(hangouts.cycle), expected([["a","joined"],["b","joined"],
      ["c","joined"],["d","joined"],["e","joined"]]));
    assert.equal(sql("select count(*) from private.notification_items"), "1");
    for (const name of ["people", "friendship", "dm", "hangout", "hangout_chat", "notification"]) {
      assert.equal(sql(`select enabled from private.${name}_feature_gate where singleton`), "t", `${name} source gate starts on`);
    }

    // Apply the actual checked-out migration against the historical fixture.
    sql(readFileSync(join(root, "supabase/migrations", migration), "utf8"));
    assert.deepEqual(roster(hangouts.cycle), expected([["a","joined"],["b","removed"],
      ["c","left"],["d","left"],["e","joined"]]),
      "host removal wins for B, while C and D still leave from the original cycle");
    assert.deepEqual(roster(hangouts.mutual), expected([["e","joined"],["b","left"],["c","left"]]),
      "mutual nonhost blockers both leave");
    assert.deepEqual(roster(hangouts.cancelled), expected([["a","joined"],["b","removed"],["e","joined"]]),
      "cancelled records reconcile and retain their host");
    assert.deepEqual(roster(hangouts.disjoint), expected([["e","joined"],["f","left"],["g","joined"]]),
      "nonoverlapping retained intervals do not cause a new departure");
    for (const id of Object.values(hangouts)) {
      assert.equal(sql(`select count(*) from public.hangouts h join public.hangout_participants p
        on p.hangout_id=h.id and p.account_id=h.host_id
        where h.id='${id}' and p.state='joined'`), "1", `host remains joined: ${id}`);
    }
    for (const [id, left, right] of [
      [hangouts.cycle,"a","b"],[hangouts.cycle,"b","c"],[hangouts.cycle,"c","d"],
      [hangouts.cycle,"d","a"],[hangouts.mutual,"b","c"],[hangouts.cancelled,"a","b"],
    ]) assert.equal(provenance(id,left,right), "1", `pre-transition provenance ${left}/${right}`);
    assert.equal(provenance(hangouts.disjoint,"f","g"), "0", "disjoint intervals do not invent peer provenance");
    assert.equal(sql("select count(*) from private.safety_reconciliation_effects"), "0");
    assert.equal(sql("select count(*) from private.notification_items"), "1", "safety transitions emit no ordinary notification");
    for (const name of ["safety", "people", "friendship", "dm", "hangout", "hangout_chat", "notification"]) {
      assert.equal(sql(`select enabled from private.${name}_feature_gate where singleton`), "f", `${name} gate remains off`);
    }
    sql("select private.safety_reconcile_existing_blocks()");
    assert.deepEqual(roster(hangouts.cycle), expected([["a","joined"],["b","removed"],
      ["c","left"],["d","left"],["e","joined"]]), "unchanged rerun has no membership effect");
    assert.equal(sql("select count(*) from private.notification_items"), "1", "rerun emits nothing");
  } finally {
    try {
      if (resetStarted) {
        reset(root); // Restore every current migration and default-off gates.
        for (const name of ["safety", "people", "friendship", "dm", "hangout", "hangout_chat", "notification"]) {
          assert.equal(sql(`select enabled from private.${name}_feature_gate where singleton`), "f", `${name} gate restored off`);
        }
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
});

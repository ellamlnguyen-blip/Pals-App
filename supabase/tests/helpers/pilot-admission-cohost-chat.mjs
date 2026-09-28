import { once } from "node:events";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";

export const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const args = [
  "exec",
  "-i",
  "supabase_db_pals-local",
  "psql",
  "-X",
  "-qAt",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-v",
  "VERBOSITY=verbose",
];
function rawSql(input) {
  try {
    return execFileSync("/private/tmp/pals-runtime/docker/docker", args, {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    }).trim();
  } catch (error) {
    throw new Error(
      "Disposable SQL error: " +
        String(error.stderr ?? "command failed").replace(
          /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
          "<redacted-token>",
        ),
    );
  }
}
export const expectedMigrationVersions = Object.freeze([
  "20260921000100",
  "20260922000100",
  "20260922000200",
  "20260922000300",
  "20260922000400",
  "20260922000500",
  "20260922000600",
  "20260923000100",
  "20260923000200",
  "20260923000300",
  "20260923000400",
  "20260923000500",
  "20260923000600",
  "20260923000700",
  "20260924000100",
  "20260924000200",
  "20260924000300",
  "20260924000400",
  "20260925000100",
  "20260925000200",
  "20260927000100",
  "20260927000200",
  "20260927000300",
  "20260927000400",
  "20260927000500",
  "20260927000600",
]);
let guardedLane = null;
function environmentGuard() {
  assert.equal(process.env.DO_NOT_TRACK, "1", "telemetry must remain disabled");
  assert.equal(
    process.env.DOCKER_HOST,
    "unix:///private/tmp/pals-lima/pals-task002/sock/docker.sock",
    "exact owned mountless socket required",
  );
  assert.equal(
    process.env.PALS_PILOT_DISPOSABLE_OWNER,
    "TASK-021A1b3b",
    "exact exclusive B3b owner required",
  );
}
function historyGuard(lane) {
  const versions = rawSql(
    "select version from supabase_migrations.schema_migrations order by version",
  ).split("\n");
  const current =
    JSON.stringify(versions) === JSON.stringify(expectedMigrationVersions);
  const prior =
    JSON.stringify(versions) ===
    JSON.stringify(expectedMigrationVersions.slice(0, 25));
  assert.ok(
    current || (lane === "prior25-upgrade" && prior),
    "exact full26 or explicit full25 upgrade manifest required",
  );
}
export function sql(input) {
  environmentGuard();
  assert.ok(guardedLane, "localTarget must guard fixture target before SQL");
  historyGuard(guardedLane);
  return rawSql(input);
}
export function localTarget(lane = "current26") {
  assert.ok(
    ["current26", "prior25-upgrade"].includes(lane),
    "fixed history lane required",
  );
  assert.equal(process.env.DO_NOT_TRACK, "1", "telemetry must remain disabled");
  assert.equal(
    process.env.DOCKER_HOST,
    "unix:///private/tmp/pals-lima/pals-task002/sock/docker.sock",
    "exact previously owned mountless disposable Docker socket required",
  );
  assert.equal(
    process.env.PALS_PILOT_DISPOSABLE_OWNER,
    "TASK-021A1b3b",
    "exclusive disposable ownership acknowledgement required",
  );
  const status = JSON.parse(
    execFileSync(
      process.env.SUPABASE_CLI ?? "supabase",
      ["status", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ),
  );
  assert.equal(status.API_URL, "http://127.0.0.1:54321");
  const dbUrl = new URL(status.DB_URL);
  assert.equal(dbUrl.hostname, "127.0.0.1");
  assert.equal(dbUrl.port, "54322");
  assert.equal(dbUrl.pathname, "/postgres");
  const container = JSON.parse(
    execFileSync(
      "/private/tmp/pals-runtime/docker/docker",
      ["inspect", "supabase_db_pals-local"],
      {
        encoding: "utf8",
      },
    ),
  )[0];
  assert.equal(container.Name, "/supabase_db_pals-local");
  assert.equal(container.State.Running, true);
  assert.ok(
    [
      "public.ecr.aws/supabase/postgres:17.6.1.167",
      "supabase/postgres:17.6.1.167",
    ].includes(container.Config.Image),
    "exact cached PostgreSQL image required",
  );
  assert.equal(
    rawSql("select current_database()||':'||session_user"),
    "postgres:postgres",
  );
  historyGuard(lane);
  guardedLane = lane;
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  async function request(path, token, body) {
    environmentGuard();
    assert.equal(
      lane,
      "current26",
      "API fixtures permit only captured current26 lane",
    );
    historyGuard(lane);
    assert.ok(
      path.startsWith("/") && !path.startsWith("//"),
      "local API path required",
    );
    const response = await fetch(`${status.API_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${token ?? key}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = await response.text();
    return { status: response.status, body: raw ? JSON.parse(raw) : null };
  }
  return {
    status,
    key,
    request,
    rpc: (name, token, body) => request(`/rest/v1/rpc/${name}`, token, body),
  };
}
export function ok(result) {
  assert.ok(
    [200, 204].includes(result.status),
    `Unexpected response status ${result.status}`,
  );
  return result.body;
}
export function resetDisposable(lane = "current26") {
  localTarget(lane);
  try {
    execFileSync(
      process.env.SUPABASE_CLI ?? "supabase",
      ["db", "reset", "--local", "--network-id", "pals-local-network"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    throw new Error(
      "Owned current-migration disposable reset failed; task incomplete",
    );
  }
  localTarget("current26");
  assertClean();
}
export function assertClean() {
  for (const table of [
    "auth.users",
    "public.accounts",
    "public.profiles",
    "public.university_memberships",
    "public.platform_roles",
    "public.hangouts",
    "public.hangout_participants",
    "storage.objects",
  ])
    assert.equal(sql(`select count(*) from ${table}`), "0", table);
  sql(
    `do $$declare t record;n bigint;live boolean;begin for t in select table_name from information_schema.tables where table_schema='private' and table_type='BASE TABLE' loop if t.table_name like '%feature_gate' then execute format('select count(*) from private.%I',t.table_name) into n;if n<>1 then raise exception 'Missing singleton original gate %',t.table_name;end if;execute format('select bool_or(enabled) from private.%I',t.table_name) into live;if live is distinct from false then raise exception 'Enabled original gate %',t.table_name;end if;elsif t.table_name not in ('pilot_availability','pilot_capabilities') then execute format('select count(*) from private.%I',t.table_name) into n;if n<>0 then raise exception 'Retained fixtures %',t.table_name;end if;end if;end loop;end;$$`,
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
}
export function session(name) {
  environmentGuard();
  assert.ok(guardedLane, "localTarget required before held SQL session");
  historyGuard(guardedLane);
  const child = spawn("/private/tmp/pals-runtime/docker/docker", args, {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (v) => {
    output += v;
  });
  child.stderr.on("data", (v) => {
    output += v;
  });
  child.stdin.write(`set application_name=${quote(name)};\n`);
  return {
    child,
    send: (query) => child.stdin.write(`${query}\n`),
    output: () => output,
    done: once(child, "exit"),
  };
}
export async function until(check) {
  for (let n = 0; n < 240; n++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Observed database lock wait timed out");
}
export async function race(
  name,
  firstQuery,
  secondQuery,
  rejection = null,
  holderSnapshotSQL = null,
  receiptPrefix = null,
) {
  const first = session(`${name}_leader`);
  const second = session(`${name}_waiter`);
  try {
    first.send(
      `begin; ${firstQuery} ${holderSnapshotSQL ? `select 'B3B_CENSUS:'||(${holderSnapshotSQL})::text;` : ""} select 'HELD';`,
    );
    await until(() => first.output().includes("HELD"));
    second.send(`begin; ${secondQuery} select 'COMPLETED'; commit;`);
    await until(
      () =>
        sql(
          `select count(*) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(`${name}_leader`)} where w.application_name=${quote(`${name}_waiter`)} and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`,
        ) === "1",
    );
    const evidence = sql(
      `select jsonb_build_object('race',${quote(name)},'holder_pid',h.pid,'waiter_pid',w.pid,'waiting_lock_types',(select jsonb_agg(distinct l.locktype) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(`${name}_leader`)} where w.application_name=${quote(`${name}_waiter`)} and h.pid=any(pg_blocking_pids(w.pid))`,
    );
    first.send("commit;");
    first.child.stdin.end();
    second.child.stdin.end();
    const [firstResult, secondResult] = await Promise.all([
      first.done,
      second.done,
    ]);
    assert.equal(firstResult[0], 0);
    assert.doesNotMatch(first.output(), /ERROR:/);
    if (rejection !== null) {
      assert.notEqual(secondResult[0], 0);
      assert.match(second.output(), /42501:/, "exact SQLSTATE required");
      assert.ok(
        second.output().includes(rejection),
        "exact authority error required",
      );
      assert.doesNotMatch(
        second.output(),
        /deadlock|serialize|timeout|40P01|40001|57014|55P03/i,
      );
      assert.doesNotMatch(second.output(), /COMPLETED/);
    } else {
      assert.equal(secondResult[0], 0);
      assert.match(second.output(), /COMPLETED/);
      assert.doesNotMatch(second.output(), /ERROR:/);
    }
    let receiptEvidence = {};
    if (receiptPrefix !== null) {
      const parseReceipt = (session) => {
        const row = session
          .output()
          .split("\n")
          .find((v) => v.startsWith(receiptPrefix));
        assert.ok(row, "actual receipt row required");
        return JSON.parse(row.slice(receiptPrefix.length));
      };
      const firstReceipt = parseReceipt(first),
        secondReceipt = parseReceipt(second);
      assert.deepEqual(
        firstReceipt,
        secondReceipt,
        "concurrent same key returns exact original7fields",
      );
      receiptEvidence = {
        receipts_equal: true,
        receipt_sha256: createHash("sha256")
          .update(JSON.stringify(firstReceipt))
          .digest("hex"),
        receipt_fields: Object.keys(firstReceipt[0]).sort(),
      };
    }
    return {
      ...JSON.parse(evidence),
      ...receiptEvidence,
      ...(holderSnapshotSQL
        ? {
            holder_snapshot: JSON.parse(
              first
                .output()
                .split("\n")
                .find((v) => v.startsWith("B3B_CENSUS:"))
                .slice(11),
            ),
          }
        : {}),
    };
  } catch (error) {
    throw new Error(
      `${name}: ${error.message}; leader=${first.output()}; waiter=${second.output()}`,
    );
  } finally {
    first.child.kill();
    second.child.kill();
  }
}

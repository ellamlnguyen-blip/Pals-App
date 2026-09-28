import {
  censusTables,
  census,
  capabilityKeys,
} from "./pilot-current-safety-fixtures.mjs";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, lstatSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";

export const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
export const dockerBinary = "/private/tmp/pals-runtime/docker/docker";
export const supabaseBinary = "/private/tmp/pals-runtime/bin/supabase";
export const socket =
  "unix:///private/tmp/pals-lima/pals-task002/sock/docker.sock";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const args = [
  "--host",
  socket,
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
    return execFileSync(dockerBinary, args, {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
    }).trim();
  } catch (error) {
    const diagnostic = /ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/.exec(
      String(error.stderr ?? ""),
    );
    const safe =
      diagnostic &&
      [
        "Safety report unavailable",
        "Safety operation unavailable",
        "Hangout operation not permitted",
        "Hangout chat unavailable",
        "Moderation unavailable",
        "Pilot management unavailable",
      ].includes(diagnostic[2].trim());
    throw new Error(
      `Disposable SQL error: ${diagnostic?.[1] ?? "transport"}: ${safe ? diagnostic[2].trim() : "operation failed"}`,
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
  "20260928000100",
]);
export const migrationFiles = Object.freeze({
  "20260921000100_identity_foundation.sql":
    "1652ac3feb644e83cea6deb1420e9782db22f54c4093ce4ca1a9ad2cede00026",
  "20260922000100_verified_onboarding.sql":
    "486777e3b94bc0e7ec71a06b56e892c85be562b7974d98f941a357c8d6f738ab",
  "20260922000200_owner_profile_enrichment.sql":
    "1e558790a18cc8f75f3ebaec029bef3600c68c6359df1300c09874d8e8e8e549",
  "20260922000300_hangout_foundation.sql":
    "dfdb9a7b4eae9380d34ccfd20a34432e6bb9fd639cb1a395f65fe5b7c8ff1332",
  "20260922000400_people_text_directory.sql":
    "d0c8c25d07bef72040b32a9c170d56a05f2b66c081d134e4419b345ecc8935fb",
  "20260922000500_people_raw_name_cursor.sql":
    "b895cc4ea9e82eaa3704a1b115ab91ee7091fcd16c78de3b204d20a6a36181b7",
  "20260922000600_people_id_cursor.sql":
    "8955873efdf6c1a18924850a3d65bcc423fe4b37fe9a5e3ec5f6a4f403ea5f98",
  "20260923000100_local_friendship.sql":
    "4774d2e2e4371dbd3996854be7bfdb2e93395f78eb5efeacf134fb5b88bf2332",
  "20260923000200_local_hangout_chat.sql":
    "65a3796bef7a96963b1664d78be030221f7c720e61ce11d746fbed66c4952147",
  "20260923000300_local_direct_messages.sql":
    "f883d899a91b147b3aa41156814884b07dbf90bcdd0aa06aba75ea0e00e75248",
  "20260923000400_local_notifications_social.sql":
    "9d6d2f3ef7364e8e532a583b45d23eacb5cf9a7de7aa9236fff9862e497befd3",
  "20260923000500_local_notifications_hangouts.sql":
    "0ae4e2c604c83c870e251477d37c2a869d5bb82364be87c649ff7966adac973e",
  "20260923000600_local_global_blocks.sql":
    "cea998d5667c16ced036b85176dd856ee686d6fbdded80b68db14934e7a84f01",
  "20260923000700_local_safety_reports.sql":
    "7e6847936cf10e4c58db73cb09b22a72f50cd32e1bea8e4b9fb20a4bd237209d",
  "20260924000100_local_moderation_review.sql":
    "b6f0baa0a6368357a088eb6443782f40aa2da84ba2bd4c2224531f693999a84f",
  "20260924000200_local_account_enforcement.sql":
    "0a1f5d20564fa87c7c27247334c570913bea9a1217c0164eddc9d067681449e5",
  "20260924000300_local_hangout_disable.sql":
    "4afd775c4a7531f702aebcac09321976172f6fbef16fa0453c99ea23b8513397",
  "20260924000400_local_attendance.sql":
    "8bc375dbf1caaa7e6945a78474557bf52bb4831351a8aa857cb3982288af60d7",
  "20260925000100_local_large_hangout_safeguards.sql":
    "ded5fdd091e11803d5a4bf53e971db9ee6efddb58a86a3f82dd4af5b542c1b34",
  "20260925000200_local_cohost_authority.sql":
    "e332af2ad56d052506f51a35949e4424136f23c739cdf373db02a339380b59c3",
  "20260927000100_private_pilot_admission_authority.sql":
    "7f424a677feb37bd25bef23a343806a3a5b3ba272f5fccc34370e5e42f423764",
  "20260927000200_pilot_owner_admission.sql":
    "27e196389c0e422afa9a03966d8dfb84a48cc0229e03c8756c3aeb9ed7fb4103",
  "20260927000300_pilot_source_safety.sql":
    "a97344460a7fa78b7a9e652e0203fcc3acecea1c3c9d49993bf975ad7198510b",
  "20260927000400_moderation_mandatory_lock_results.sql":
    "6806ae080cf3c68c1e5426fb15994523c210cba60597d5c6639d4cdd9ff60e47",
  "20260927000500_pilot_ordinary_lifecycle.sql":
    "215c55a26b302ab0fc8f69cd5127122fde343663cab3090dcddc773cd8da56e1",
  "20260927000600_pilot_cohost_chat.sql":
    "a8d181810320170493bc1f625ee59bdfe87034a0633dd37384b3ed3b3846fb45",
  "20260928000100_pilot_current_safety.sql":
    "9dafa05e597928533ba51f100d29bc5c64c248d6f33f4a134b1f058d8d7640e8",
});
const configSha256 =
  "eb17d8b4be23f8cfc93f964ded2e944c5411034895de2510aa1e5ae6533df0e6";
let guardedLane = null;
const redact = (value) =>
  String(value)
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "<redacted-token>",
    )
    .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1<redacted>@");
function environmentGuard() {
  assert.equal(process.env.DO_NOT_TRACK, "1", "telemetry must remain disabled");
  assert.equal(process.env.DOCKER_HOST, socket, "exact owned socket required");
  assert.equal(
    process.env.PALS_PILOT_DISPOSABLE_OWNER,
    "TASK-021A1b3c",
    "exact exclusive B3c owner required",
  );
  for (const key of [
    "DOCKER_CONTEXT",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
    "DOCKER_TLS",
  ])
    assert.ok(!process.env[key], "conflicting Docker override forbidden");
  assert.ok(
    !process.env.SUPABASE_CLI || process.env.SUPABASE_CLI === supabaseBinary,
    "fixed cached Supabase binary required",
  );
  assert.equal(
    realpathSync(socket.slice(7)),
    socket.slice(7),
    "exact nonredirected socket path required",
  );
  const entry = lstatSync(socket.slice(7));
  assert.ok(
    entry.isSocket() && entry.uid === 501,
    "existing UID501 Unix socket required",
  );
  assert.equal(
    createHash("sha256")
      .update(readFileSync(resolve(root, "supabase/config.toml")))
      .digest("hex"),
    configSha256,
    "reviewed pals-local loopback config required",
  );
  const names = readdirSync(resolve(root, "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.deepEqual(
    names,
    Object.keys(migrationFiles),
    "exact full27 source manifest required",
  );
  for (const name of names)
    assert.equal(
      createHash("sha256")
        .update(readFileSync(resolve(root, "supabase/migrations", name)))
        .digest("hex"),
      migrationFiles[name],
      "reviewed immutable migration required",
    );
}
export function cliEnvironment() {
  environmentGuard();
  return {
    ...process.env,
    PATH: `/private/tmp/pals-runtime/docker:${process.env.PATH ?? ""}`,
    DOCKER_HOST: socket,
    DO_NOT_TRACK: "1",
  };
}
function historyGuard(lane) {
  assert.ok(
    ["current27", "prior26-upgrade"].includes(lane),
    "exact history lane required",
  );
  const versions = rawSql(
    "select version from supabase_migrations.schema_migrations order by version",
  ).split("\n");
  const current =
    JSON.stringify(versions) === JSON.stringify(expectedMigrationVersions);
  const prior =
    JSON.stringify(versions) ===
    JSON.stringify(expectedMigrationVersions.slice(0, 26));
  assert.ok(
    current || (lane === "prior26-upgrade" && prior),
    "exact full27 or explicit full26 upgrade manifest required",
  );
}
function targetGuard(lane) {
  environmentGuard();
  let container, image;
  try {
    container = JSON.parse(
      execFileSync(
        dockerBinary,
        ["--host", socket, "inspect", "supabase_db_pals-local"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    )[0];
    image = JSON.parse(
      execFileSync(
        dockerBinary,
        ["--host", socket, "image", "inspect", container.Config.Image],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    )[0];
  } catch {
    throw new Error("Exact existing disposable database/image unavailable");
  }
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
    container.Image,
    image.Id,
    "actual running image identity required",
  );
  assert.deepEqual(
    container.NetworkSettings.Ports["5432/tcp"],
    [{ HostIp: "127.0.0.1", HostPort: "54322" }],
    "loopback DB binding required",
  );
  assert.equal(
    rawSql(
      "select current_database()||':'||session_user||':'||current_setting('server_version_num')",
    ),
    "postgres:postgres:170006",
    "actual PostgreSQL17.6 session/database required",
  );
  historyGuard(lane);
}
export function sql(input, { lane = "current27" } = {}) {
  assert.equal(guardedLane, lane, "localTarget required for exact SQL lane");
  targetGuard(lane);
  return rawSql(input);
}
export function localTarget(lane = "current27") {
  guardedLane = null;
  assert.ok(
    ["current27", "prior26-upgrade"].includes(lane),
    "exact history lane required",
  );
  targetGuard(lane);
  let status;
  try {
    status = JSON.parse(
      execFileSync(supabaseBinary, ["status", "--output", "json"], {
        cwd: root,
        env: cliEnvironment(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
  } catch {
    throw new Error("Exact disposable CLI status unavailable");
  }
  assert.equal(
    status.API_URL,
    "http://127.0.0.1:54321",
    "exact local API required",
  );
  let dbUrl;
  try {
    dbUrl = new URL(status.DB_URL);
  } catch {
    throw new Error("Invalid disposable database status URL");
  }
  assert.equal(dbUrl.hostname, "127.0.0.1");
  assert.equal(dbUrl.port, "54322");
  assert.equal(dbUrl.pathname, "/postgres");
  assert.equal(
    status.INBUCKET_URL ?? status.MAILPIT_URL,
    "http://127.0.0.1:54324",
    "exact loopback mail required",
  );
  guardedLane = lane;
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  assert.ok(
    typeof key === "string" && key.length > 0,
    "local public credential required",
  );
  async function request(path, token, body, options = {}) {
    assert.equal(lane, "current27", "API accepts captured current27 only");
    assert.equal(guardedLane, "current27", "API guard lane changed");
    targetGuard("current27");
    assert.ok(
      typeof path === "string" &&
        path.startsWith("/") &&
        !path.startsWith("//") &&
        !path.includes("\\"),
      "fixed local API path required",
    );
    const url = new URL(path, "http://127.0.0.1:54321");
    assert.equal(
      url.origin,
      "http://127.0.0.1:54321",
      "request must resolve to fixed local origin",
    );
    let response;
    try {
      response = await fetch(url, {
        method: options.method ?? (body === undefined ? "GET" : "POST"),
        redirect: "error",
        headers: {
          apikey: key,
          authorization: `Bearer ${token ?? key}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const raw = await response.text();
      return { status: response.status, body: raw ? JSON.parse(raw) : null };
    } catch {
      throw new Error("Guarded loopback API transport/JSON failure");
    }
  }
  return {
    status,
    key,
    request,
    rpc: (name, token, body) => {
      assert.match(name, /^[a-z][a-z0-9_]*$/, "RPC identifier required");
      return request(`/rest/v1/rpc/${name}`, token, body);
    },
  };
}
export function ok(result) {
  assert.ok(
    [200, 204].includes(result.status),
    `Unexpected response status ${result.status}`,
  );
  return result.body;
}
export function resetDisposable(lane = "current27") {
  localTarget(lane);
  try {
    execFileSync(
      supabaseBinary,
      ["db", "reset", "--local", "--network-id", "pals-local-network"],
      {
        cwd: root,
        env: cliEnvironment(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 20 * 1024 * 1024,
      },
    );
  } catch {
    throw new Error("Owned full27 reset failed; task incomplete");
  }
  localTarget("current27");
  assertClean();
}
export function assertClean() {
  // Imported only when explicitly invoked; imports never contact a target.
  assert.equal(guardedLane, "current27");
  targetGuard("current27");
  const snapshot = census();
  assert.deepEqual(Object.keys(snapshot).sort(), censusTables.slice().sort());
  for (const [table, rows] of Object.entries(snapshot)) {
    if (table === "public.universities") {
      assert.deepEqual(
        rows.map((r) => r.id),
        ["00000000-0000-4000-8000-000000000001"],
      );
      assert.equal(rows[0].slug, "unc-chapel-hill");
      assert.equal(rows[0].active, true);
      assert.deepEqual(rows[0].allowed_email_domains, [
        "live.unc.edu",
        "unc.edu",
        "ad.unc.edu",
        "business.unc.edu",
        "kenan-flagler.unc.edu",
      ]);
    } else if (table.endsWith("_feature_gate")) {
      assert.deepEqual(rows, [{ enabled: false, singleton: true }], table);
    } else if (table === "private.pilot_availability") {
      assert.equal(rows.length, 1);
      assert.equal(rows[0].singleton, true);
      assert.equal(rows[0].enabled, false);
      assert.equal(rows[0].revision, 1);
    } else if (table === "private.pilot_capabilities") {
      assert.deepEqual(
        rows.map((r) => r.key).sort(),
        capabilityKeys.slice().sort(),
      );
      for (const row of rows) {
        assert.equal(row.enabled, false);
        assert.equal(row.revision, 1);
      }
    } else
      assert.deepEqual(rows, [], table + " zero synthetic/retained records");
  }
}
export function session(name) {
  assert.equal(guardedLane, "current27", "held SQL session requires current27");
  targetGuard("current27");
  const child = spawn(dockerBinary, args, {
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
    send: (query) => {
      assert.equal(guardedLane, "current27");
      targetGuard("current27");
      return child.stdin.write(`${query}\n`);
    },
    output: () => redact(output),
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
      `begin; ${firstQuery} ${holderSnapshotSQL ? `select 'B3C_CENSUS:'||(${holderSnapshotSQL})::text;` : ""} select 'HELD';`,
    );
    await until(() => first.output().includes("HELD"));
    second.send(`begin; ${secondQuery} select 'COMPLETED'; commit;`);
    await until(
      () =>
        sql(
          `select count(*) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(`${name}_leader`)} where w.application_name=${quote(`${name}_waiter`)} and w.wait_event_type='Lock' and h.pid<>w.pid and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)`,
        ) === "1",
    );
    const evidence = sql(
      `select jsonb_build_object('race',${quote(name)},'holder_pid',h.pid,'waiter_pid',w.pid,'waiting_lock_types',(select jsonb_agg(distinct l.locktype) from pg_locks l where l.pid=w.pid and not l.granted)) from pg_stat_activity w join pg_stat_activity h on h.application_name=${quote(`${name}_leader`)} where w.application_name=${quote(`${name}_waiter`)} and h.pid<>w.pid and h.pid=any(pg_blocking_pids(w.pid))`,
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
        "concurrent same key returns exact original receipt fields",
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
                .find((v) => v.startsWith("B3C_CENSUS:"))
                .slice(11),
            ),
          }
        : {}),
    };
  } catch (error) {
    throw new Error(
      `${name}: ${redact(error.message)}; session transcripts withheld from error logs`,
    );
  } finally {
    if (!first.child.stdin.destroyed) first.child.stdin.end("rollback;\n");
    if (!second.child.stdin.destroyed) second.child.stdin.end("rollback;\n");
  }
}

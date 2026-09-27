import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";

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
];
export function sql(input) {
  return execFileSync("docker", args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}
export function localTarget() {
  assert.equal(
    process.env.PALS_PILOT_DISPOSABLE_OWNER,
    "TASK-021A1a",
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
    execFileSync("docker", ["inspect", "supabase_db_pals-local"], {
      encoding: "utf8",
    }),
  )[0];
  assert.equal(container.Name, "/supabase_db_pals-local");
  assert.equal(container.State.Running, true);
  assert.match(container.Config.Image, /supabase\/postgres/);
  assert.equal(
    sql("select current_database()||':'||session_user"),
    "postgres:postgres",
  );
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  async function request(path, token, body) {
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
export function denied(result) {
  assert.ok(
    [400, 401, 403, 404].includes(result.status),
    `Unexpected allowed response status ${result.status}`,
  );
}
export const auth = (id) =>
  `set local role authenticated; set local request.jwt.claims=${quote(JSON.stringify({ sub: id, role: "authenticated" }))};`;
export const management = (
  actor,
  target,
  state,
  expected,
  request = crypto.randomUUID(),
) =>
  `${auth(actor)} select * from public.set_pilot_account_admission('${target}','${state}',${expected},'Local race','${request}');`;
export const trusted = (target, state, revision) =>
  `select private.set_pilot_manager_fixture('${target}','${state}',${revision},'Local executor fixture','${crypto.randomUUID()}');`;
export function restoreDefaults() {
  sql(
    "begin; select private.pilot_evidence_write_lock(); update private.pilot_availability set enabled=false; update private.pilot_capabilities set enabled=false; commit;",
  );
}
export function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
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
async function until(check) {
  for (let n = 0; n < 240; n++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Observed database lock wait timed out");
}
export async function race(name, firstQuery, secondQuery, rejection = false) {
  const first = session(`${name}_leader`);
  const second = session(`${name}_waiter`);
  try {
    first.send(`begin; ${firstQuery} select 'HELD';`);
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
    if (rejection) {
      assert.notEqual(secondResult[0], 0);
      assert.match(second.output(), /Pilot management unavailable/);
      assert.doesNotMatch(second.output(), /COMPLETED/);
    } else {
      assert.equal(secondResult[0], 0);
      assert.match(second.output(), /COMPLETED/);
      assert.doesNotMatch(second.output(), /ERROR:/);
    }
    return JSON.parse(evidence);
  } finally {
    first.child.kill();
    second.child.kill();
  }
}

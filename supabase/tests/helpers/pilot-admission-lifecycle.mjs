import { once } from "node:events";
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
export function sql(input) {
  try {
    return execFileSync("docker", args, {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
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
export function localTarget() {
  assert.equal(
    process.env.PALS_PILOT_DISPOSABLE_OWNER,
    "TASK-021A1b3a",
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
export function resetDisposable() {
  localTarget();
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
  assert.equal(
    sql(
      "select count(*)||':'||max(version) from supabase_migrations.schema_migrations",
    ),
    "25:20260927000500",
  );
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
export async function until(check) {
  for (let n = 0; n < 240; n++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Observed database lock wait timed out");
}
export async function race(name, firstQuery, secondQuery, rejection = null) {
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
    return JSON.parse(evidence);
  } catch (error) {
    throw new Error(
      `${name}: ${error.message}; leader=${first.output()}; waiter=${second.output()}`,
    );
  } finally {
    first.child.kill();
    second.child.kill();
  }
}

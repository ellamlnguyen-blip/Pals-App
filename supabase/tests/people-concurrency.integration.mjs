import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase", ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321", "disposable loopback Supabase required");
const first = "12000000-0000-4000-8000-000000000001";
const second = "12000000-0000-4000-8000-000000000002";
const asUser = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
function sql(query) {
  return execFileSync("docker", args, { input: query, encoding: "utf8" }).trim();
}
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output, done: once(child, "exit") };
}
async function until(check) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("People concurrency barrier timed out");
}
async function waiting(name) {
  await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`) === "1");
}

test("People pair serialization and post-wait revocation", async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${first}','people-race-a@unc.edu',now()),('${second}','people-race-b@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${first}','${second}');
    update public.profiles set real_name='Ready person',major='Science',graduation_year=2028,
      bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
      where user_id in ('${first}','${second}');
    update private.people_feature_gate set enabled=true; update private.safety_feature_gate set enabled=true;
    insert into private.people_preferences(account_id,opted_in) values ('${first}',true),('${second}',true);`);
  try {
    const a = session("task011a_first_block"), b = session("task011a_second_block");
    try {
      a.send(`begin; ${asUser(first)} select public.set_people_block('${second}',true); select 'first_blocked';`);
      await until(() => a.output().includes("first_blocked"));
      b.send(`begin; ${asUser(second)} select public.set_people_block('${first}',true); commit;`);
      await waiting("task011a_second_block");
      a.send("commit;"); a.child.stdin.end(); b.child.stdin.end();
      await a.done; await b.done;
      assert.match(b.output(), /Safety operation unavailable/, "losing mutual block is denied after pair lock");
      assert.equal(sql("select count(*) from private.people_blocks"), "1", "only one direction committed");
    } finally { a.child.kill(); b.child.kill(); }

    // A gate change while a block call waits must be seen after the pair lock.
    sql("delete from private.people_blocks");
    const lock = session("task011a_gate_lock"), blocked = session("task011a_gate_waiter");
    try {
      lock.send(`begin; select pg_advisory_xact_lock(hashtextextended(least('${first}','${second}')||':'||greatest('${first}','${second}'),0)); select 'held';`);
      await until(() => lock.output().includes("held"));
      blocked.send(`begin; ${asUser(first)} select public.set_people_block('${second}',true); commit;`);
      await waiting("task011a_gate_waiter");
      sql("update private.people_feature_gate set enabled=false");
      lock.send("commit;"); lock.child.stdin.end(); blocked.child.stdin.end();
      await lock.done; await blocked.done;
      assert.match(blocked.output(), /Safety operation unavailable/, "gate loss after wait denies block");
      assert.equal(sql("select count(*) from private.people_blocks"), "0");
    } finally { lock.child.kill(); blocked.child.kill(); }

    for (const isolation of ["repeatable read", "serializable"]) {
      assert.throws(() => sql(`begin isolation level ${isolation}; ${asUser(first)}
        select public.get_people_preference(); rollback;`), /People operation unavailable/);
    }
  } finally {
    sql(`update private.people_feature_gate set enabled=false; update private.safety_feature_gate set enabled=false;
      delete from private.people_blocks where blocker_id in ('${first}','${second}') or blocked_id in ('${first}','${second}');
      delete from private.people_preferences where account_id in ('${first}','${second}');
      delete from auth.users where id in ('${first}','${second}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${first}','${second}');`);
  }
});

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// SERIAL disposable-local SQL sessions. Every claimed wait is observed in
// pg_stat_activity before releasing the leading transaction.
const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase",
  ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U",
  "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const actor = "51900000-0000-4000-8000-000000000001";
const peer = "51900000-0000-4000-8000-000000000002";
const claims = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
const key = (n) => `51900000-0000-4000-8001-${String(n).padStart(12, "0")}`;
const sql = (query) => execFileSync("docker", args, { input: query,
  encoding: "utf8" }).trim();
const submit = (n, mode = "user") => `${claims(actor)} select * from public.submit_safety_report(
  '${key(n)}','${mode}','${peer}','harassment',null);`;
const submitHangout = (n, id) => `${claims(actor)} select * from public.submit_safety_report(
  '${key(n)}','hangout','${id}','harassment',null);`;
const count = () => Number(sql(`select count(*) from private.safety_reports where reporter_id='${actor}'`));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, failed) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    failed?.();
    await pause(25);
  }
  failed?.();
  throw new Error("Observed database lock wait timed out");
}
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", code = null;
  child.stdout.on("data", (part) => output += part);
  child.stderr.on("data", (part) => output += part);
  child.on("exit", (exit) => code = exit);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`),
    output: () => output, code: () => code, done: once(child, "exit") };
}
let sequence = 0;
async function race(label, leaderSql, waiterSql, waiterError = false) {
  const tag = `report_${++sequence}_${label}`;
  const leader = session(`${tag}_leader`);
  const waiter = session(`${tag}_waiter`);
  try {
    leader.send(`begin; ${leaderSql} select 'report_leader_held';`);
    await until(() => leader.output().includes("report_leader_held"), () => {
      if (leader.code() !== null || /ERROR:/.test(leader.output()))
        assert.fail(`${label}: leader failed: ${leader.output()}`);
    });
    waiter.send(`begin; ${waiterSql} commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity
      where application_name='${tag}_waiter' and wait_event_type='Lock'`) === "1", () => {
      if (waiter.code() !== null || /ERROR:/.test(waiter.output()))
        assert.fail(`${label}: no wait: ${waiter.output()}`);
    });
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    const [leaderExit, waiterExit] = await Promise.all([leader.done, waiter.done]);
    assert.equal(leaderExit[0], 0, leader.output());
    assert.equal(waiterExit[0], waiterError ? 3 : 0, waiter.output());
    if (waiterError) assert.match(waiter.output(), /Safety report unavailable/);
    return { leader: leader.output(), waiter: waiter.output() };
  } finally { leader.child.kill(); waiter.child.kill(); }
}

test("report retries, fifth slot and revocations observe database lock waits", {
  concurrency: false, timeout: 120_000,
}, async () => {
  let hangout = null;
  try {
    sql(`insert into auth.users(id,email,email_confirmed_at) values
      ('${actor}','report-race-1@unc.edu',now()),('${peer}','report-race-2@unc.edu',now());
      insert into storage.objects(bucket_id,name,owner_id)
        select 'profile-photos',id::text||'/primary.png',id::text
        from public.accounts where id in ('${actor}','${peer}');
      update public.profiles set real_name='Report race',major='Science',
        graduation_year=2028,bio='Fixture',primary_photo_path=user_id::text||'/primary.png'
        where user_id in ('${actor}','${peer}');
      insert into private.people_preferences(account_id,opted_in)
        values ('${actor}',true),('${peer}',true);
      update private.safety_feature_gate set enabled=true;
      update private.people_feature_gate set enabled=true;`);

    await race("same_key", submit(1), submit(1));
    assert.equal(count(), 1, "same-key race inserted only once");
    await race("source_first", "update private.people_feature_gate set enabled=false;",
      submit(2), true);
    assert.equal(count(), 1);
    sql("update private.people_feature_gate set enabled=true");
    await race("report_first", submit(2),
      "update private.people_feature_gate set enabled=false;");
    assert.equal(count(), 2, "current report committed before source disable");
    sql("update private.people_feature_gate set enabled=true");

    // One retained owned block supports later reports independent of People.
    sql(`insert into private.people_blocks(blocker_id,blocked_id)
      values ('${actor}','${peer}');`);
    sql(`begin; ${submit(3)} commit; begin; ${submit(4)} commit;`);
    assert.equal(count(), 4);
    await race("fifth_slot", submit(5), submit(6), true);
    assert.equal(count(), 5);
    await race("retry_at_limit", submit(5), submit(5));
    assert.equal(count(), 5, "replay consumed no sixth slot");
    await race("gate_first_replay", "update private.safety_feature_gate set enabled=false;",
      submit(5), true);
    sql("update private.safety_feature_gate set enabled=true");
    await race("account_first_replay", `update public.accounts set status='suspended'
      where id='${actor}';`, submit(5), true);
    sql(`update public.accounts set status='active' where id='${actor}'`);

    // Move old reports outside the window to exercise new-write revocation.
    sql(`update private.safety_reports set submitted_at=clock_timestamp()-interval '2 hours'
      where reporter_id='${actor}'`);
    sql(`delete from private.people_blocks where blocker_id='${actor}' and blocked_id='${peer}';
      update private.hangout_feature_gate set enabled=true;`);
    hangout = sql(`begin; ${claims(peer)} select public.create_hangout('${key(90)}',
      'Race source',now()+interval '1 hour','Race area',35,-79); commit;`);
    assert.match(hangout, /^[0-9a-f-]{36}$/);
    await race("hangout_gate_first",
      "update private.hangout_feature_gate set enabled=false;",
      submitHangout(91, hangout), true);
    sql("update private.hangout_feature_gate set enabled=true");
    await race("hangout_report_first", submitHangout(91, hangout),
      "update private.hangout_feature_gate set enabled=false;");
    assert.equal(count(), 6, "current Hangout report committed before source disable");
    await race("gate_first_new", "update private.safety_feature_gate set enabled=false;",
      submit(7), true);
    sql("update private.safety_feature_gate set enabled=true");
    await race("account_first_new", `update public.accounts set status='suspended'
      where id='${actor}';`, submit(7), true);
    assert.equal(count(), 6);
    assert.throws(() => sql(`begin isolation level repeatable read; ${claims(actor)}
      select public.submit_safety_report('${key(8)}','user','${peer}','harassment',null);
      rollback;`), /Safety operation unavailable/);
  } finally {
    sql(`update private.safety_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      delete from private.safety_report_requests where reporter_id='${actor}';
      delete from private.safety_reports where reporter_id='${actor}';
      delete from private.hangout_create_requests where host_id='${peer}';
      delete from public.hangouts where host_id='${peer}' and title='Race source';
      update private.hangout_feature_gate set enabled=false;
      delete from private.people_blocks where blocker_id='${actor}' and blocked_id='${peer}';
      update public.profiles set primary_photo_path=null
        where user_id in ('${actor}','${peer}');
      delete from private.people_preferences where account_id in ('${actor}','${peer}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${actor}','${peer}');
      delete from auth.users where id in ('${actor}','${peer}');`);
  }
});

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Disposable local Postgres only. This test deliberately holds overlapping locks.
const dockerArgs = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const host = "70000000-0000-4000-8000-000000000001";
const peer = "70000000-0000-4000-8000-000000000002";
const late = "70000000-0000-4000-8000-000000000003";
const request = "70000000-0000-4000-8000-000000000070";
const auth = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
function sql(query) {
  return execFileSync("docker", dockerArgs, { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}
function session(name) {
  const child = spawn("docker", dockerArgs, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (v) => (output += v));
  child.stderr.on("data", (v) => (output += v));
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (q) => child.stdin.write(`${q}\n`), output: () => output, done: once(child, "exit") };
}
async function until(check) {
  for (let n = 0; n < 200; n++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("Hangout concurrency barrier timed out");
}
async function overlap(firstSql, secondSql, secondName, expectedSecond) {
  const a = session("task005_first"), b = session(secondName);
  try {
    a.send(`begin; ${firstSql} select 'first_locked';`);
    await until(() => a.output().includes("first_locked"));
    b.send(`begin; ${secondSql} select 'second_done'; commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity where application_name='${secondName}' and wait_event_type='Lock';`) === "1");
    a.send("commit;");
    a.child.stdin.end();
    b.child.stdin.end();
    const [aCode] = await a.done;
    await b.done;
    assert.equal(aCode, 0, a.output());
    assert.match(b.output(), expectedSecond);
  } finally {
    a.child.kill(); b.child.kill();
  }
}
test("Hangout create, join, removal, cancellation and revision races", async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values ('${host}','task005-race-host@unc.edu',now()),('${peer}','task005-race-peer@unc.edu',now()),('${late}','task005-race-late@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id) select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${host}','${peer}','${late}');
    update public.profiles set real_name='Fixture',major='Science',graduation_year=2028,bio='Local test',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${host}','${peer}','${late}');
    update private.hangout_feature_gate set enabled=true;`);
  try {
    const start = sql("select (now()+interval '1 hour')::text;");
    const create = `select public.create_hangout('${request}','Race plan','${start}','Area',35,-79);`;
    await overlap(`${auth(host)} ${create}`, `${auth(host)} ${create}`, "task005_retry", /^[0-9a-f-]{36}/m);
    const id = sql(`select hangout_id from private.hangout_create_requests where host_id='${host}' and request_id='${request}';`);
    assert.equal(sql(`select count(*) from public.hangouts where id='${id}';`), "1", "same request commits one row");
    assert.equal(sql(`select count(*) from public.hangouts where host_id='${host}';`), "1", "same request creates one total Hangout");
    assert.equal(sql(`select count(*) from private.hangout_create_requests where host_id='${host}';`), "1", "same request creates one ledger row");
    assert.equal(sql(`select count(*) from public.hangout_participants where hangout_id='${id}' and account_id='${host}';`), "1", "same request creates one host membership");
    // A creator that waited on the request lock must recheck live access.
    for (const [suffix, revoke, restore] of [
      ["071", `update public.accounts set status='suspended' where id='${host}';`, `update public.accounts set status='active' where id='${host}';`],
      ["072", "update private.hangout_feature_gate set enabled=false;", "update private.hangout_feature_gate set enabled=true;"],
    ]) {
      const requestId = `70000000-0000-4000-8000-000000000${suffix}`;
      const blocker = session("task005_lock_holder"), creator = session("task005_waiting_create");
      try {
        blocker.send(`begin; select pg_advisory_xact_lock(hashtextextended('${host}${requestId}',0)); select 'lock_held';`);
        await until(() => blocker.output().includes("lock_held"));
        creator.send(`begin; ${auth(host)} select public.create_hangout('${requestId}','Revoked', '${start}','Area',35,-79); commit;`);
        await until(() => sql("select count(*) from pg_stat_activity where application_name='task005_waiting_create' and wait_event_type='Lock';") === "1");
        sql(revoke);
        blocker.send("commit;"); blocker.child.stdin.end(); creator.child.stdin.end();
        await blocker.done; await creator.done;
        assert.match(creator.output(), /Hangout operation not permitted/, "post-lock authorization denied");
        assert.equal(sql(`select count(*) from private.hangout_create_requests where request_id='${requestId}';`), "0");
      } finally {
        blocker.child.kill(); creator.child.kill(); sql(restore);
      }
    }
    // Older isolation snapshots are deliberately excluded from this local boundary.
    for (const isolation of ["repeatable read", "serializable"]) {
      const reader = session(`task005_${isolation.replaceAll(" ", "_")}`);
      try {
        reader.send(`begin isolation level ${isolation}; ${auth(host)} select 'public='||count(*) from public.hangouts; select 'private='||count(*) from public.hangout_private_locations; select public.join_hangout('${id}'); commit;`);
        reader.child.stdin.end();
        await reader.done;
        assert.match(reader.output(), /public=0/);
        assert.match(reader.output(), /private=0/);
        assert.match(reader.output(), /Hangout operation not permitted|Safety operation unavailable/);
      } finally { reader.child.kill(); }
    }
    await overlap(`${auth(host)} select public.edit_hangout('${id}',1,'Edited',now()+interval '2 hours','Area',35,-79);`, `${auth(host)} select public.edit_hangout('${id}',1,'Stale',now()+interval '3 hours','Area',35,-79);`, "task005_stale", /Stale Hangout revision/);
    assert.equal(sql(`select title from public.hangouts where id='${id}';`), "Edited");
    sql(`begin; ${auth(peer)} select public.join_hangout('${id}'); commit;`);
    await overlap(`${auth(host)} select public.remove_hangout_participant('${id}','${peer}');`, `${auth(peer)} select public.join_hangout('${id}');`, "task005_rejoin", /Hangout operation not permitted/);
    assert.equal(sql(`select state from public.hangout_participants where hangout_id='${id}' and account_id='${peer}';`), "removed");
    await overlap(`${auth(host)} select public.cancel_hangout('${id}',2);`, `${auth(late)} select public.join_hangout('${id}');`, "task005_cancel_join", /Hangout operation not permitted/);
    assert.equal(sql(`select count(*) from public.hangout_participants where hangout_id='${id}' and account_id='${late}';`), "0");
  } finally {
    sql(`update private.hangout_feature_gate set enabled=false; delete from private.hangout_create_requests where host_id in ('${host}','${peer}','${late}'); delete from public.hangouts where host_id in ('${host}','${peer}','${late}'); delete from auth.users where id in ('${host}','${peer}','${late}'); set storage.allow_delete_query='true'; delete from storage.objects where owner_id in ('${host}','${peer}','${late}');`);
  }
});

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
  "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (query) => execFileSync("docker", args,
  { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const uid = (n) => `52010000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hid = (n) => `52010000-0000-4000-8001-${String(n).padStart(12, "0")}`;
const auth = (n) => `set local role authenticated;
  set local request.jwt.claims='{"sub":"${uid(n)}","role":"authenticated"}';`;
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (v) => { output += v; });
  child.stderr.on("data", (v) => { output += v; });
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`),
    output: () => output, done: once(child, "exit") };
}
async function until(check) {
  for (let n = 0; n < 200; n++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Observed-lock barrier timed out");
}
async function observe(name) {
  await until(() => sql(`select count(*) from pg_stat_activity where
    application_name='${name}' and wait_event_type='Lock'`) === "1");
}
async function stop(...sessions) {
  for (const item of sessions) item.child.kill();
}

test("serialized crossing joins and gate/source revocations leave no partial signal", {
  concurrency: false, timeout: 120_000,
}, async () => {
  sql(`begin;
    insert into auth.users(id,email,email_confirmed_at)
    select ('52010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
      'task020a-race-'||n||'@unc.edu',now() from generate_series(1,30) n;
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text
      from public.accounts where id::text like '52010000-%';
    update public.profiles set real_name='Race fixture',major='Science',
      graduation_year=2028,bio='Local',primary_photo_path=user_id::text||'/primary.png'
      where user_id::text like '52010000-%';
    update private.hangout_feature_gate set enabled=true;
    update private.large_hangout_feature_gate set enabled=true;
    insert into public.hangouts(id,university_id,host_id,title,starts_at,
      public_place,public_latitude,public_longitude)
    select ('52010000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,
      '00000000-0000-4000-8000-000000000001', '${uid(1)}',
      'Race '||n,now()+interval '1 hour','Campus area',35.913,-79.055
      from generate_series(1,5) n;
    insert into public.hangout_participants(hangout_id,account_id,state)
    select ('52010000-0000-4000-8001-'||lpad(h::text,12,'0'))::uuid,
      ('52010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'joined'
      from generate_series(1,5) h cross join generate_series(1,24) n;
    commit;`);
  try {
    // First crossing join commits, second crosses above the same threshold.
    // The latter waits on the shared social lock and cannot duplicate signal.
    const first = session("task020a_cross_first");
    const second = session("task020a_cross_second");
    try {
      first.send(`begin; ${auth(25)} select public.join_hangout('${hid(1)}'); select 'held';`);
      await until(() => first.output().includes("held"));
      second.send(`begin; ${auth(26)} select public.join_hangout('${hid(1)}');
        select 'joined_second'; commit;`);
      await observe("task020a_cross_second");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(1)}'`), "0", "uncommitted signal invisible");
      first.send("commit;"); first.child.stdin.end(); second.child.stdin.end();
      await first.done; await second.done;
      assert.match(second.output(), /joined_second/);
      assert.equal(sql(`select count(*) from public.hangout_participants
        where hangout_id='${hid(1)}' and state='joined'`), "26");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(1)}'`), "1", "one committed signal");
    } finally { await stop(first, second); }

    // A disable with the gate row lock first suppresses only signal work.
    const disable = session("task020a_disable_first");
    const joining = session("task020a_waiting_join");
    try {
      disable.send("begin; update private.large_hangout_feature_gate set enabled=false; select 'held';");
      await until(() => disable.output().includes("held"));
      joining.send(`begin; ${auth(25)} select public.join_hangout('${hid(2)}');
        select 'joined_after_disable'; commit;`);
      await observe("task020a_waiting_join");
      disable.send("commit;"); disable.child.stdin.end(); joining.child.stdin.end();
      await disable.done; await joining.done;
      assert.match(joining.output(), /joined_after_disable/);
      assert.equal(sql(`select count(*) from public.hangout_participants
        where hangout_id='${hid(2)}' and state='joined'`), "25");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(2)}'`), "0", "gate-off join remains valid without signal");
    } finally { await stop(disable, joining); }
    sql("update private.large_hangout_feature_gate set enabled=true");

    // A close that wins the source lock denies a waiting join atomically.
    const close = session("task020a_close_first");
    const late = session("task020a_close_waiter");
    try {
      close.send(`begin; ${auth(1)} select public.set_hangout_joining('${hid(3)}',1,'closed');
        select 'held';`);
      await until(() => close.output().includes("held"));
      late.send(`begin; ${auth(25)} select public.join_hangout('${hid(3)}'); commit;`);
      await observe("task020a_close_waiter");
      close.send("commit;"); close.child.stdin.end(); late.child.stdin.end();
      await close.done; await late.done;
      assert.match(late.output(), /Hangout operation not permitted/);
      assert.equal(sql(`select count(*) from public.hangout_participants
        where hangout_id='${hid(3)}' and state='joined'`), "24");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(3)}'`), "0");
    } finally { await stop(close, late); }

    // A committed host block before join's source checks also denies it.
    const block = session("task020a_block_first");
    const blocked = session("task020a_block_waiter");
    try {
      block.send(`begin; select private.social_hangout_mutation_lock();
        insert into private.people_blocks(blocker_id,blocked_id)
          values ('${uid(1)}','${uid(25)}'); select 'held';`);
      await until(() => block.output().includes("held"));
      blocked.send(`begin; ${auth(25)} select public.join_hangout('${hid(4)}'); commit;`);
      await observe("task020a_block_waiter");
      block.send("commit;"); block.child.stdin.end(); blocked.child.stdin.end();
      await block.done; await blocked.done;
      assert.match(blocked.output(), /Hangout operation not permitted/);
      assert.equal(sql(`select count(*) from public.hangout_participants
        where hangout_id='${hid(4)}' and state='joined'`), "24");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(4)}'`), "0");
    } finally { await stop(block, blocked); }
    for (const isolation of ["repeatable read", "serializable"]) {
      const attempt = session(`task020a_${isolation.replaceAll(" ", "_")}`);
      try {
        attempt.send(`begin isolation level ${isolation}; ${auth(25)}
          select public.join_hangout('${hid(5)}'); commit;`);
        attempt.child.stdin.end(); await attempt.done;
        assert.match(attempt.output(), /Safety operation unavailable/);
        assert.equal(sql(`select count(*) from private.large_hangout_signals
          where hangout_id='${hid(5)}'`), "0");
      } finally { await stop(attempt); }
    }
  } finally {
    sql(`update private.large_hangout_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;`);
  }
});

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
    update private.moderation_feature_gate set enabled=true;
    insert into public.platform_roles(user_id,role) values ('${uid(29)}','moderator');
    insert into public.hangouts(id,university_id,host_id,title,starts_at,
      public_place,public_latitude,public_longitude)
    select ('52010000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,
      '00000000-0000-4000-8000-000000000001', '${uid(1)}',
      'Race '||n,now()+interval '1 hour','Campus area',35.913,-79.055
      from generate_series(1,7) n;
    insert into public.hangout_participants(hangout_id,account_id,state)
    select ('52010000-0000-4000-8001-'||lpad(h::text,12,'0'))::uuid,
      ('52010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'joined'
      from generate_series(1,7) h cross join generate_series(1,24) n;
    insert into private.safety_reports(id,reporter_id,target_type,target_id,
      category,provenance_kind,provenance_ref_id)
    select ('52010000-0000-4000-8002-'||lpad(n::text,12,'0'))::uuid,
      '${uid(30)}','hangout',
      ('52010000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,
      'harassment','current_hangout',
      ('52010000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid
      from generate_series(6,7) n;
    commit;`);
  try {
    for (const n of [6, 7]) {
      sql(`begin; ${auth(29)} select * from public.transition_moderation_case(
        '52010000-0000-4000-8002-${String(n).padStart(12, "0")}',
        '52010000-0000-4000-8003-${String(n).padStart(12, "0")}',
        0,'start_review'); commit;`);
    }
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
    sql(`delete from private.people_blocks where blocker_id='${uid(1)}'
      and blocked_id='${uid(25)}'`);

    // A committed moderation disable wins the same social/parent lock order;
    // the waiting join cannot leave a participant or size signal behind.
    const report = (n) => `52010000-0000-4000-8002-${String(n).padStart(12, "0")}`;
    const action = (n) => `52010000-0000-4000-8003-${String(100 + n).padStart(12, "0")}`;
    const moderation = (n) => `${auth(29)} select * from
      public.apply_hangout_moderation_action('${report(n)}','${action(n)}',
      1,'Local decision');`;
    const disableFirst = session("task020a_mod_first");
    const deniedJoin = session("task020a_mod_join_waiter");
    try {
      disableFirst.send(`begin; ${moderation(6)} select 'held';`);
      await until(() => disableFirst.output().includes("held"));
      deniedJoin.send(`begin; ${auth(25)} select public.join_hangout('${hid(6)}'); commit;`);
      await observe("task020a_mod_join_waiter");
      disableFirst.send("commit;"); disableFirst.child.stdin.end(); deniedJoin.child.stdin.end();
      const [[leaderCode], [waiterCode]] = await Promise.all([disableFirst.done, deniedJoin.done]);
      assert.equal(leaderCode, 0, disableFirst.output());
      assert.equal(waiterCode, 3, deniedJoin.output());
      assert.match(deniedJoin.output(), /Hangout operation not permitted/);
      assert.equal(sql(`select count(*) from public.hangout_participants
        where hangout_id='${hid(6)}' and state='joined'`), "24");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(6)}'`), "0");
      assert.equal(sql(`select count(*) from private.hangout_disables
        where hangout_id='${hid(6)}'`), "1");
    } finally { await stop(disableFirst, deniedJoin); }

    // If admission commits first, the size signal commits with it; the
    // subsequent disable retains both private evidence and membership.
    const joinFirst = session("task020a_mod_join_first");
    const disableWaiter = session("task020a_mod_waiter");
    try {
      joinFirst.send(`begin; ${auth(25)} select public.join_hangout('${hid(7)}');
        select 'held';`);
      await until(() => joinFirst.output().includes("held"));
      disableWaiter.send(`begin; ${moderation(7)} select 'disabled'; commit;`);
      await observe("task020a_mod_waiter");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(7)}'`), "0", "uncommitted join signal stays private");
      joinFirst.send("commit;"); joinFirst.child.stdin.end(); disableWaiter.child.stdin.end();
      const [[joinCode], [disableCode]] = await Promise.all([joinFirst.done, disableWaiter.done]);
      assert.equal(joinCode, 0, joinFirst.output());
      assert.equal(disableCode, 0, disableWaiter.output());
      assert.match(disableWaiter.output(), /disabled/);
      assert.equal(sql(`select count(*) from public.hangout_participants
        where hangout_id='${hid(7)}' and state='joined'`), "25");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(7)}'`), "1");
      assert.equal(sql(`select count(*) from private.hangout_disables
        where hangout_id='${hid(7)}'`), "1");
    } finally { await stop(joinFirst, disableWaiter); }

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
    // A host read that begins behind the parent's row lock observes a
    // committed cancellation and returns no stale size value.
    const cancel = session("task020a_cancel_first");
    const reader = session("task020a_size_waiter");
    try {
      cancel.send(`begin; ${auth(1)} select public.cancel_hangout('${hid(5)}',1);
        select 'held';`);
      await until(() => cancel.output().includes("held"));
      reader.send(`begin; ${auth(1)} select * from public.get_hangout_large_state('${hid(5)}');
        commit;`);
      await observe("task020a_size_waiter");
      cancel.send("commit;"); cancel.child.stdin.end(); reader.child.stdin.end();
      await cancel.done; await reader.done;
      assert.match(reader.output(), /Hangout size unavailable/);
      assert.equal(sql(`select status from public.hangouts where id='${hid(5)}'`), "cancelled");
      assert.equal(sql(`select count(*) from private.large_hangout_signals
        where hangout_id='${hid(5)}'`), "0");
    } finally { await stop(cancel, reader); }
  } finally {
    sql(`update private.large_hangout_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      update private.moderation_feature_gate set enabled=false;`);
  }
});

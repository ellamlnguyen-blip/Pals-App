import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
  "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (query) => execFileSync("docker", args,
  { input: query, encoding: "utf8" }).trim();
assert.equal(sql("select current_database()"), "postgres");
const uid = (n) => `54010000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const hid = (n) => `54010000-0000-4000-8001-${String(n).padStart(12, "0")}`;
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
  throw new Error("Observed database lock wait timed out");
}
async function race(name, firstQuery, secondQuery, rejected) {
  const first = session(`${name}_leader`);
  const second = session(`${name}_waiter`);
  try {
    first.send(`begin; ${firstQuery} select 'held';`);
    await until(() => first.output().includes("held"));
    second.send(`begin; ${secondQuery} select 'waited'; commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity
      where application_name='${name}_waiter' and wait_event_type='Lock'`) === "1");
    first.send("commit;");
    first.child.stdin.end(); second.child.stdin.end();
    await first.done; await second.done;
    if (rejected) {
      assert.match(second.output(), rejected);
      assert.doesNotMatch(second.output(), /waited/);
    } else {
      assert.match(second.output(), /waited/);
      assert.doesNotMatch(second.output(), /ERROR:/);
    }
    return { firstOutput: first.output(), secondOutput: second.output() };
  } finally { first.child.kill(); second.child.kill(); }
}

test("observed social-lock waits recheck cohost membership, authority and lifecycle", {
  concurrency: false, timeout: 120_000,
}, async () => {
  sql(`begin;
    insert into auth.users(id,email,email_confirmed_at)
      select ('54010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
        'cohost-race-'||n||'@unc.edu',now() from generate_series(1,4) n;
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text
      from public.accounts where id::text like '54010000-%';
    update public.profiles set real_name='Cohost race',major='Science',
      graduation_year=2028,bio='Local',primary_photo_path=user_id::text||'/primary.png'
      where user_id::text like '54010000-%';
    update private.hangout_feature_gate set enabled=true;
    insert into public.hangouts(id,university_id,host_id,title,starts_at,
      public_place,public_latitude,public_longitude)
      select ('54010000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,
        '00000000-0000-4000-8000-000000000001','${uid(1)}',
        'Race '||n,now()+interval '1 hour','Area',35,-79
      from generate_series(1,12) n;
    insert into public.hangout_participants(hangout_id,account_id,state)
      select ('54010000-0000-4000-8001-'||lpad(h::text,12,'0'))::uuid,
        ('54010000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'joined'
      from generate_series(1,12) h cross join generate_series(1,3) n;
    commit;`);
  try {
    await race("cohost_leave_promote",
      `${auth(2)} select public.leave_hangout('${hid(1)}');`,
      `${auth(1)} select public.promote_hangout_cohost('${hid(1)}','${uid(2)}',1);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select count(*) from private.hangout_cohosts where hangout_id='${hid(1)}'`), "0");

    sql(`begin; ${auth(1)} select public.promote_hangout_cohost('${hid(2)}','${uid(2)}',1); commit;`);
    await race("cohost_demote_edit",
      `${auth(1)} select public.demote_hangout_cohost('${hid(2)}','${uid(2)}',2);`,
      `${auth(2)} select public.edit_hangout('${hid(2)}',3,'Forged',
        (select starts_at from public.hangouts where id='${hid(2)}'),'Area',35,-79);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select title from public.hangouts where id='${hid(2)}'`), "Race 2");

    sql(`begin; ${auth(1)} select public.promote_hangout_cohost('${hid(3)}','${uid(2)}',1); commit;`);
    await race("cohost_cancel_remove",
      `${auth(1)} select public.cancel_hangout('${hid(3)}',2);`,
      `${auth(2)} select public.remove_hangout_participant('${hid(3)}','${uid(3)}',3);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select state from public.hangout_participants where hangout_id='${hid(3)}'
      and account_id='${uid(3)}'`), "joined");
    sql(`begin; ${auth(1)} select public.remove_hangout_participant('${hid(3)}','${uid(2)}',3); commit;`);
    assert.equal(sql(`select count(*) from private.hangout_cohosts where hangout_id='${hid(3)}'`), "0");

    const cancelledRemoval = await race("cohost_cancel_host_remove",
      `${auth(1)} select public.cancel_hangout('${hid(12)}',1);
        select 'CANCEL_TS='||extract(epoch from updated_at)::text
          from public.hangouts where id='${hid(12)}';`,
      `${auth(1)} select public.remove_hangout_participant('${hid(12)}','${uid(2)}',2);`,
      null);
    const cancellationStamp = cancelledRemoval.firstOutput.match(/CANCEL_TS=([^\s]+)/)?.[1];
    assert.ok(cancellationStamp, "leader captured cancellation timestamp before queued host removal");
    assert.equal(sql(`select extract(epoch from updated_at)::text
      from public.hangouts where id='${hid(12)}'`), cancellationStamp);
    assert.equal(sql(`select status||':'||revision from public.hangouts where id='${hid(12)}'`), "cancelled:3");
    assert.equal(sql(`select state from public.hangout_participants where hangout_id='${hid(12)}'
      and account_id='${uid(2)}'`), "removed");

    await race("cohost_remove_promote",
      `${auth(1)} select public.remove_hangout_participant('${hid(4)}','${uid(2)}',1);`,
      `${auth(1)} select public.promote_hangout_cohost('${hid(4)}','${uid(2)}',2);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select count(*) from private.hangout_cohosts where hangout_id='${hid(4)}'`), "0");

    sql(`begin; ${auth(1)} select public.promote_hangout_cohost('${hid(5)}','${uid(2)}',1); commit;`);
    await race("cohost_demote_joining",
      `${auth(1)} select public.demote_hangout_cohost('${hid(5)}','${uid(2)}',2);`,
      `${auth(2)} select public.set_hangout_joining('${hid(5)}',3,'closed');`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select joining_state from public.hangouts where id='${hid(5)}'`), "open");

    sql(`begin; ${auth(1)} select public.promote_hangout_cohost('${hid(6)}','${uid(2)}',1); commit;`);
    await race("cohost_demote_remove",
      `${auth(1)} select public.demote_hangout_cohost('${hid(6)}','${uid(2)}',2);`,
      `${auth(2)} select public.remove_hangout_participant('${hid(6)}','${uid(3)}',3);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select state from public.hangout_participants where hangout_id='${hid(6)}'
      and account_id='${uid(3)}'`), "joined");

    sql(`begin;
      insert into public.platform_roles(user_id,role) values('${uid(4)}','moderator');
      update private.moderation_feature_gate set enabled=true;
      insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
        provenance_kind,provenance_ref_id) values
        ('54010000-0000-4000-8002-000000000007','${uid(3)}','hangout',
        '${hid(7)}','harassment','current_hangout','${hid(7)}');
      commit;`);
    sql(`begin; ${auth(4)} select * from public.transition_moderation_case(
      '54010000-0000-4000-8002-000000000007',
      '54010000-0000-4000-8003-000000000007',0,'start_review'); commit;`);
    sql(`begin; ${auth(1)} select public.promote_hangout_cohost('${hid(7)}','${uid(2)}',1); commit;`);
    await race("cohost_disable_edit",
      `${auth(4)} select * from public.apply_hangout_moderation_action(
        '54010000-0000-4000-8002-000000000007',
        '54010000-0000-4000-8004-000000000007',1,'Disable fixture');`,
      `${auth(2)} select public.edit_hangout('${hid(7)}',2,'Forged',
        (select starts_at from public.hangouts where id='${hid(7)}'),'Area',35,-79);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select count(*) from private.hangout_disables where hangout_id='${hid(7)}'`), "1");

    sql(`begin; ${auth(1)} select public.promote_hangout_cohost('${hid(8)}','${uid(2)}',1); commit;`);
    await race("cohost_actor_readiness_edit",
      `update public.profiles set primary_photo_path=null where user_id='${uid(2)}';`,
      `${auth(2)} select public.edit_hangout('${hid(8)}',2,'Forged',
        (select starts_at from public.hangouts where id='${hid(8)}'),'Area',35,-79);`,
      /Hangout operation not permitted/);
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png'
      where user_id='${uid(2)}';`);

    await race("cohost_target_readiness_promote",
      `update public.profiles set primary_photo_path=null where user_id='${uid(3)}';`,
      `${auth(1)} select public.promote_hangout_cohost('${hid(9)}','${uid(3)}',1);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select count(*) from private.hangout_cohosts where hangout_id='${hid(9)}'`), "0");
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png'
      where user_id='${uid(3)}';`);

    await race("cohost_source_gate_promote",
      `update private.hangout_feature_gate set enabled=false;`,
      `${auth(1)} select public.promote_hangout_cohost('${hid(10)}','${uid(2)}',1);`,
      /Hangout operation not permitted/);
    sql(`update private.hangout_feature_gate set enabled=true;`);

    sql(`update private.safety_feature_gate set enabled=true;`);
    await race("cohost_block_promote",
      `${auth(1)} select public.set_safety_block('${uid(3)}',true);`,
      `${auth(1)} select public.promote_hangout_cohost('${hid(11)}','${uid(3)}',1);`,
      /Hangout operation not permitted/);
    assert.equal(sql(`select count(*) from private.hangout_cohosts where hangout_id='${hid(11)}'`), "0");
    assert.equal(sql(`select count(*) from private.hangout_peer_provenance where hangout_id='${hid(11)}'
      and low_id=least('${uid(1)}','${uid(3)}')::uuid
      and high_id=greatest('${uid(1)}','${uid(3)}')::uuid`), "1");
    sql(`begin; ${auth(1)} select public.set_safety_block('${uid(3)}',false); commit;`);
  } finally {
    // Moderator disable evidence is immutable. The caller must reset this
    // disposable local database after the suite to clear its fixtures.
    sql(`update private.safety_feature_gate set enabled=false;
      update private.moderation_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;`);
  }
});

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres",
  "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const a = "15000000-0000-4000-8000-000000000001", b = "15000000-0000-4000-8000-000000000002";
const claims = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
function sql(query) { return execFileSync("docker", args, { input: query, encoding: "utf8" }).trim(); }
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => output += chunk);
  child.stderr.on("data", (chunk) => output += chunk);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output, done: once(child,"exit") };
}
async function until(check) {
  for (let i=0;i<200;i++) { if (check()) return; await new Promise((r)=>setTimeout(r,25)); }
  throw new Error("DM race barrier timed out");
}
async function waiting(name) {
  await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`) === "1");
}
async function race(leaderName,leaderQuery,waiterName,waiterQuery,assertion) {
  const leader=session(leaderName), waiter=session(waiterName);
  try {
    leader.send(`begin; ${leaderQuery} select 'held';`);
    await until(()=>leader.output().includes("held"));
    waiter.send(`begin; ${waiterQuery} commit;`);
    await waiting(waiterName);
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    await leader.done; await waiter.done;
    assertion(waiter.output());
  } finally { leader.child.kill(); waiter.child.kill(); }
}

test("DM pair, block, gate and opt-out serialize across real sessions", async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${a}','dm-race-a@unc.edu',now()),('${b}','dm-race-b@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${a}','${b}');
    update public.profiles set real_name='DM race',major='Science',graduation_year=2028,
      bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${a}','${b}');
    insert into private.people_preferences(account_id,opted_in) values ('${a}',true),('${b}',true);
    update private.people_feature_gate set enabled=true; update private.safety_feature_gate set enabled=true; update private.dm_feature_gate set enabled=true;`);
  try {
    await race("dm_create_leader",`${claims(a)} select public.create_dm_request('${b}',
      '15000000-0000-4000-8000-000000000091','First');`,"dm_create_waiter",
      `${claims(b)} select public.create_dm_request('${a}',
      '15000000-0000-4000-8000-000000000092','Opposite');`,
      (output)=>assert.match(output,/DM unavailable/));
    assert.equal(sql(`select count(*) from private.dm_pairs where state='pending' and low_id='${a}'`),"1");
    const generation=sql(`select generation_id from private.dm_pairs where state='pending' and low_id='${a}'`);
    await race("dm_block_leader",`${claims(a)} select public.set_people_block('${b}',true);`,
      "dm_reply_waiter",`${claims(b)} select public.transition_dm('${a}','${generation}','reply',
      '15000000-0000-4000-8000-000000000093','Yes');`,
      (output)=>assert.match(output,/DM unavailable/));
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${generation}'`),"blocked");
    sql(`delete from private.people_blocks where blocker_id='${a}' and blocked_id='${b}'`);
    const reverse=sql(`begin; ${claims(b)} select public.create_dm_request('${a}',
      '15000000-0000-4000-8000-000000000094','Reverse'); commit;`).split("\n")[0];
    await race("dm_optout_leader",`${claims(a)} select public.set_people_preference(false);`,
      "dm_accept_waiter",`${claims(a)} select public.transition_dm('${b}','${reverse}','accept');`,
      (output)=>assert.match(output,/DM unavailable/));
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${reverse}'`),"pending");
    sql(`update private.people_preferences set opted_in=true where account_id='${a}'`);
    sql(`begin; ${claims(a)} select public.transition_dm('${b}','${reverse}','accept'); commit;`);
    await race("dm_block_send_leader",`${claims(a)} select public.set_people_block('${b}',true);`,
      "dm_send_waiter",`${claims(b)} select public.send_dm_message('${a}','${reverse}',
      '15000000-0000-4000-8000-000000000095','Late send');`,
      (output)=>assert.match(output,/DM unavailable/));
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${reverse}'`),"blocked");
    assert.equal(sql(`select count(*) from private.dm_messages where generation_id='${reverse}'`),"1");
    sql(`delete from private.people_blocks where blocker_id='${a}' and blocked_id='${b}'`);
    const creator=session("dm_blocked_creator"), blocker=session("dm_block_against_loser"),
      opposite=session("dm_opposite_after_block");
    try {
      creator.send(`begin; ${claims(a)} select public.create_dm_request('${b}',
        '15000000-0000-4000-8000-000000000096','First before block'); select 'created';`);
      await until(()=>creator.output().includes("created"));
      blocker.send(`begin; ${claims(b)} select public.set_people_block('${a}',true);
        commit; select 'block_committed';`);
      await waiting("dm_block_against_loser");
      opposite.send(`begin; ${claims(b)} select public.create_dm_request('${a}',
        '15000000-0000-4000-8000-000000000097','Losing opposite'); commit;`);
      await waiting("dm_opposite_after_block");
      creator.send("commit;"); creator.child.stdin.end();
      await creator.done;
      await until(()=>blocker.output().includes("block_committed"));
      blocker.child.stdin.end(); opposite.child.stdin.end();
      await blocker.done; await opposite.done;
      assert.match(opposite.output(),/DM unavailable/);
      assert.equal(sql(`select state from private.dm_pairs where initiator_id='${a}'
        and state='blocked' order by created_at desc limit 1`),"blocked");
    } finally { creator.child.kill(); blocker.child.kill(); opposite.child.kill(); }
    sql(`delete from private.people_blocks where blocker_id='${b}' and blocked_id='${a}'`);
    const pendingIgnore=sql(`begin; ${claims(b)} select public.create_dm_request('${a}',
      '15000000-0000-4000-8000-000000000098','Please reply'); commit;`).split("\n")[0];
    await race("dm_ignore_leader",`${claims(a)} select public.transition_dm('${b}',
      '${pendingIgnore}','ignore');`,"dm_reply_after_ignore",`${claims(a)}
      select public.transition_dm('${b}','${pendingIgnore}','reply',
      '15000000-0000-4000-8000-000000000099','Too late');`,
      (output)=>assert.match(output,/DM unavailable/));
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${pendingIgnore}'`),"ignored");
    const pendingReply=sql(`begin; ${claims(a)} select public.create_dm_request('${b}',
      '15000000-0000-4000-8000-0000000000a1','Answer this'); commit;`).split("\n")[0];
    await race("dm_reply_leader",`${claims(b)} select public.transition_dm('${a}',
      '${pendingReply}','reply','15000000-0000-4000-8000-0000000000a2','Answered');`,
      "dm_ignore_after_reply",`${claims(b)} select public.transition_dm('${a}',
      '${pendingReply}','ignore');`,(output)=>assert.match(output,/DM unavailable/));
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${pendingReply}'`),"accepted");
    for (const isolation of ["repeatable read","serializable"])
      assert.throws(()=>sql(`begin isolation level ${isolation}; ${claims(a)}
        select * from public.list_dm_inbox(); rollback;`),/DM unavailable/);
  } finally {
    sql(`update private.dm_feature_gate set enabled=false; update private.people_feature_gate set enabled=false; update private.safety_feature_gate set enabled=false;
      set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in ('${a}','${b}');
      delete from private.dm_messages where author_id in ('${a}','${b}');
      delete from private.dm_pairs where low_id='${a}' and high_id='${b}';
      delete from private.dm_suppression where initiator_id in ('${a}','${b}');
      delete from private.people_blocks where blocker_id in ('${a}','${b}') or blocked_id in ('${a}','${b}');
      delete from auth.users where id in ('${a}','${b}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${a}','${b}');`);
  }
});

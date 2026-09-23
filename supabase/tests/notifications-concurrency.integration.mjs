import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase",
  ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres",
  "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const a = "16000000-0000-4000-8000-000000000011", b = "16000000-0000-4000-8000-000000000012";
const claims = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
function sql(query) { return execFileSync("docker", args, { input: query, encoding: "utf8" }).trim(); }
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => output += chunk);
  child.stderr.on("data", (chunk) => output += chunk);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output,
    done: once(child, "exit") };
}
async function until(check) {
  for (let i=0;i<200;i++) { if (check()) return; await new Promise((r)=>setTimeout(r,25)); }
  throw new Error("notification race barrier timed out");
}
async function waiting(name) {
  await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`) === "1");
}
async function race(leaderName,leaderQuery,waiterName,waiterQuery) {
  const leader=session(leaderName),waiter=session(waiterName);
  try {
    leader.send(`begin; ${leaderQuery} select 'held';`);
    await until(()=>leader.output().includes("held"));
    waiter.send(`begin; ${waiterQuery} commit;`);
    await waiting(waiterName);
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    await leader.done; await waiter.done;
    assert.doesNotMatch(waiter.output(), /ERROR:/);
  } finally { leader.child.kill(); waiter.child.kill(); }
}

test("notification gate and mute orders serialize with source events", async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${a}','notification-race-a@unc.edu',now()),('${b}','notification-race-b@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${a}','${b}');
    update public.profiles set real_name='Notification race',major='Science',graduation_year=2028,
      bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${a}','${b}');
    insert into private.people_preferences(account_id,opted_in) values('${a}',true),('${b}',true);
    update private.people_feature_gate set enabled=true;
    update private.dm_feature_gate set enabled=true;`);
  let generation;
  try {
    generation = sql(`begin; ${claims(a)} select public.create_dm_request('${b}',
      '16000000-0000-4000-8000-000000000081','First'); commit;`).split("\n")[0];
    sql(`begin; ${claims(b)} select public.transition_dm('${a}','${generation}','accept'); commit;`);
    sql("update private.notification_feature_gate set enabled=true");
    const count=()=>Number(sql(`select count(*) from private.notification_items where recipient_id='${b}' and event_code='dm_message'`));
    const send=(key,body)=>`${claims(a)} select public.send_dm_message('${b}','${generation}','${key}','${body}');`;
    await race("nt_mute_first",`${claims(b)} select public.set_notification_preference('messages',false);`,
      "nt_send_after_mute",send("16000000-0000-4000-8000-000000000082","After mute"));
    assert.equal(count(),0,"committed mute suppresses waiting event");
    sql(`begin; ${claims(b)} select public.set_notification_preference('messages',true); commit;`);
    await race("nt_send_first",send("16000000-0000-4000-8000-000000000083","Before mute"),
      "nt_mute_after_send",`${claims(b)} select public.set_notification_preference('messages',false);`);
    assert.equal(count(),1,"event lock first commits before mute");
    sql(`begin; ${claims(b)} select public.set_notification_preference('messages',true); commit;`);
    await race("nt_gate_off_first","update private.notification_feature_gate set enabled=false;",
      "nt_send_after_gate",send("16000000-0000-4000-8000-000000000084","After gate"));
    assert.equal(count(),1,"committed gate disable suppresses waiting event");
    sql("update private.notification_feature_gate set enabled=true");
    await race("nt_send_before_gate",send("16000000-0000-4000-8000-000000000085","Before gate"),
      "nt_gate_off_after","update private.notification_feature_gate set enabled=false;");
    assert.equal(count(),2,"event holding shared gate row may commit first");
    assert.equal(sql("select enabled from private.notification_feature_gate"),"f");
  } finally {
    sql(`update private.notification_feature_gate set enabled=false;
      update private.dm_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in ('${a}','${b}');
      delete from private.dm_messages where author_id in ('${a}','${b}');
      delete from private.dm_pairs where low_id='${a}' and high_id='${b}';
      delete from private.notification_items where recipient_id in ('${a}','${b}') or actor_id in ('${a}','${b}');
      delete from private.notification_preferences where recipient_id in ('${a}','${b}');
      delete from auth.users where id in ('${a}','${b}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${a}','${b}');`);
  }
});

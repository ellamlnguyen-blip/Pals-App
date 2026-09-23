import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase", ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const host = "51500000-0000-4000-8000-000000000011", peer = "51500000-0000-4000-8000-000000000012", removed = "51500000-0000-4000-8000-000000000013";
const claims = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
const sql = (query) => execFileSync("docker", args, { input: query, encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check) { for (let i = 0; i < 200; i++) { if (check()) return; await sleep(25); } throw new Error("race barrier timed out"); }
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => output += chunk);
  child.stderr.on("data", (chunk) => output += chunk);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output, done: once(child, "exit") };
}
async function race(label, leaderQuery, waiterQuery, expectedError = false) {
  const leader = session(`${label}_leader`), waiter = session(`${label}_waiter`);
  try {
    leader.send(`begin; ${leaderQuery} select 'held';`);
    await until(() => leader.output().includes("held"));
    waiter.send(`begin; ${waiterQuery} commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity where application_name='${label}_waiter' and wait_event_type='Lock'`) === "1");
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    const [leaderExit, waiterExit] = await Promise.all([leader.done, waiter.done]);
    assert.equal(leaderExit[0], 0, leader.output());
    if (expectedError) assert.match(waiter.output(), /ERROR:/); else { assert.equal(waiterExit[0], 0, waiter.output()); assert.doesNotMatch(waiter.output(), /ERROR:/); }
  } finally { leader.child.kill(); waiter.child.kill(); }
}

test("observed parent-row and recipient/gate races preserve recipients", async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values ('${host}','notice-race-host@unc.edu',now()),('${peer}','notice-race-peer@unc.edu',now()),('${removed}','notice-race-removed@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id) select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${host}','${peer}','${removed}');
    update public.profiles set real_name='Notice race',major='Science',graduation_year=2028,bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${host}','${peer}','${removed}');
    update private.hangout_feature_gate set enabled=true;
    update private.hangout_chat_feature_gate set enabled=true;
    update private.notification_feature_gate set enabled=true;`);
  let hangout;
  try {
    hangout = sql(`begin; ${claims(host)} select public.create_hangout('51500000-0000-4000-8001-000000000011','Race',now()+interval '1 hour','Area',35,-79); commit;`).split("\n")[0];
    const count = (code) => Number(sql(`select count(*) from private.notification_items where recipient_id='${peer}' and event_code='${code}'`));
    const send = (n) => `${claims(host)} select message_id from public.send_hangout_message('${hangout}','51500000-0000-4000-8002-${String(n).padStart(12, "0")}','Text ${n}');`;
    const join = () => sql(`begin; ${claims(peer)} select public.join_hangout('${hangout}'); commit;`);
    join();
    sql(`begin; ${claims(removed)} select public.join_hangout('${hangout}'); commit;`);
    await race("hb_leave_edit", `${claims(peer)} select public.leave_hangout('${hangout}');`,
      `${claims(host)} select public.edit_hangout('${hangout}',1,'Edited', (select starts_at from public.hangouts where id='${hangout}'),'Area',35,-79);`);
    assert.equal(count("hangout_edited"), 0, "leave commits before edit recipient selection");
    await race("hb_remove_edit", `${claims(host)} select public.remove_hangout_participant('${hangout}','${removed}');`,
      `${claims(host)} select public.edit_hangout('${hangout}',2,'Edited again', (select starts_at from public.hangouts where id='${hangout}'),'Area',35,-79);`);
    assert.equal(Number(sql(`select count(*) from private.notification_items where recipient_id='${removed}' and event_code='hangout_edited'`)), 1,
      "removed attendee receives no post-removal edit item");
    join();
    await race("hb_leave_send", `${claims(peer)} select public.leave_hangout('${hangout}');`, send(1));
    assert.equal(count("hangout_chat_message"), 0, "leave commits before chat fan-out");
    join();
    await race("hb_mute_send", `${claims(peer)} select public.set_notification_preference('messages',false);`, send(2));
    assert.equal(count("hangout_chat_message"), 0, "committed mute suppresses waiting chat item");
    sql(`begin; ${claims(peer)} select public.set_notification_preference('messages',true); commit;`);
    await race("hb_send_mute", send(3), `${claims(peer)} select public.set_notification_preference('messages',false);`);
    assert.equal(count("hangout_chat_message"), 1, "event lock first commits before mute");
    sql(`begin; ${claims(peer)} select public.set_notification_preference('messages',true); commit;`);
    await race("hb_gate_send", "update private.notification_feature_gate set enabled=false;", send(4));
    assert.equal(count("hangout_chat_message"), 1, "committed gate disable suppresses waiting event");
    sql("update private.notification_feature_gate set enabled=true");
    await race("hb_send_gate", send(5), "update private.notification_feature_gate set enabled=false;");
    assert.equal(count("hangout_chat_message"), 2, "event holding gate lock commits before disable");
    sql("update private.notification_feature_gate set enabled=true");
    await race("hb_cancel_send", `${claims(host)} select public.cancel_hangout('${hangout}',3);`, `${claims(peer)} select public.send_hangout_message('${hangout}','51500000-0000-4000-8002-000000000099','Denied');`, true);
    assert.equal(count("hangout_chat_message"), 2, "post-cancellation send creates no item");
    assert.equal(Number(sql(`select count(*) from private.hangout_messages m join private.hangout_conversations c on c.id=m.conversation_id where c.hangout_id='${hangout}' and m.author_id='${peer}'`)), 0);
  } finally {
    const target = hangout ?? "00000000-0000-0000-0000-000000000000";
    sql(`update private.notification_feature_gate set enabled=false;
      update private.hangout_chat_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      delete from private.notification_items where recipient_id in ('${host}','${peer}','${removed}') or actor_id in ('${host}','${peer}','${removed}');
      delete from private.notification_preferences where recipient_id in ('${host}','${peer}','${removed}');
      set chat.allow_fixture_cleanup='true';
      delete from private.hangout_message_requests where hangout_id='${target}';
      delete from private.hangout_messages where conversation_id in (select id from private.hangout_conversations where hangout_id='${target}');
      delete from private.hangout_conversations where hangout_id='${target}';
      delete from private.hangout_create_requests where hangout_id='${target}';
      delete from public.hangouts where id='${target}';
      update public.profiles set primary_photo_path=null where user_id in ('${host}','${peer}','${removed}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${host}','${peer}','${removed}');
      delete from auth.users where id in ('${host}','${peer}','${removed}');`);
  }
});

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Disposable local Postgres sessions. Final reset removes immutable evidence.
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
  "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (input) => execFileSync("docker", args, { input, encoding: "utf8" }).trim();
const uid = (suffix) => `53300000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const hid = (suffix) => `53300000-0000-4000-8004-${String(suffix).padStart(12, "0")}`;
const rid = (suffix) => `53300000-0000-4000-8002-${String(suffix).padStart(12, "0")}`;
const key = (suffix) => `53300000-0000-4000-8003-${String(suffix).padStart(12, "0")}`;
const operator = uid(1), host = uid(2), attendee = uid(3), reporter = uid(4), second = uid(5);
const claim = (id) => `set local role authenticated;
  set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
const disable = (n, request = 100 + n) => `${claim(operator)}
  select * from public.apply_hangout_moderation_action('${rid(n)}','${key(request)}',1,'Local decision');`;
const start = (n) => `${claim(operator)}
  select * from public.transition_moderation_case('${rid(n)}','${key(n)}',0,'start_review');`;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "", code = null;
  child.stdout.on("data", (part) => output += part);
  child.stderr.on("data", (part) => output += part);
  child.on("exit", (value) => code = value);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (value) => child.stdin.write(`${value}\n`),
    output: () => output, code: () => code, done: once(child, "exit") };
}
async function until(check, diagnostic) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    diagnostic();
    await pause(25);
  }
  throw Error("database lock wait was not observed");
}
let serial = 0;
async function race(label, leaderSql, waiterSql, waiterFails) {
  const tag = `b2_${++serial}_${label}`;
  const leader = session(`${tag}_leader`), waiter = session(`${tag}_waiter`);
  try {
    leader.send(`begin; ${leaderSql} select 'leader_ready';`);
    await until(() => leader.output().includes("leader_ready"), () => {
      if (leader.code() !== null || /ERROR:/.test(leader.output()))
        assert.fail(`${label} leader: ${leader.output()}`);
    });
    waiter.send(`begin; ${waiterSql} commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity
      where application_name='${tag}_waiter' and wait_event_type='Lock'`) === "1", () => {
      if (waiter.code() !== null || /ERROR:/.test(waiter.output()))
        assert.fail(`${label} waiter: ${waiter.output()}`);
    });
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    const [left, right] = await Promise.all([leader.done, waiter.done]);
    assert.equal(left[0], 0, leader.output());
    assert.equal(right[0], waiterFails ? 3 : 0, waiter.output());
    if (waiterFails) assert.match(waiter.output(), /unavailable|not permitted/i);
  } finally { leader.child.kill(); waiter.child.kill(); }
}
const edit = (n) => `${claim(host)} select public.edit_hangout('${hid(n)}',1,
  'Edited',now()+interval '1 hour','Area',35,-79);`;
const join = (n) => `${claim(attendee)} select public.join_hangout('${hid(n)}');`;
const chat = (n) => `${claim(host)} select * from public.send_hangout_message(
  '${hid(n)}','${key(300 + n)}','A message');`;
const cancel = (n) => `${claim(host)} select public.cancel_hangout('${hid(n)}',1);`;
const writers = [edit, join, chat, cancel];

test("Hangout disable serializes with source writers and operator revocation", {
  concurrency: false, timeout: 180_000,
}, async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${operator}','b2-race-operator@unc.edu',now()),
    ('${host}','b2-race-host@unc.edu',now()),
    ('${attendee}','b2-race-attendee@unc.edu',now()),
    ('${reporter}','b2-race-reporter@unc.edu',now()),
    ('${second}','b2-race-second@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text
      from public.accounts where id in ('${operator}','${host}','${attendee}');
    update public.profiles set real_name='B2 race',major='Science',graduation_year=2028,
      bio='Fixture',primary_photo_path=user_id::text||'/primary.png'
      where user_id in ('${operator}','${host}','${attendee}');
    insert into public.platform_roles(user_id,role) values
      ('${operator}','moderator'),('${second}','admin');
    update private.hangout_feature_gate set enabled=true;
    update private.hangout_chat_feature_gate set enabled=true;
    update private.moderation_feature_gate set enabled=true;
    `);
  // Each parent and its required host participant commit in one transaction.
  for (let n = 1; n <= 13; n++) sql(`begin;
    insert into public.hangouts(id,university_id,host_id,title,
      starts_at,public_place,public_latitude,public_longitude) values
      ('${hid(n)}',(select id from public.universities where slug='unc-chapel-hill'),
       '${host}','Fixture',now()+interval '1 hour','Area',35,-79);
    insert into public.hangout_participants(hangout_id,account_id,state)
      values ('${hid(n)}','${host}','joined');
    commit;
    insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
      provenance_kind,provenance_ref_id) values
      ('${rid(n)}','${reporter}','hangout','${hid(n)}','harassment',
       'current_hangout','${hid(n)}');
    begin; ${start(n)} commit;`);
  assert.throws(() => sql(`begin isolation level repeatable read; ${disable(1)} rollback;`),
    /Safety operation unavailable/);
  for (let i = 0; i < writers.length; i++) {
    const n = i + 1;
    await race(`disable_first_${i}`, disable(n), writers[i](n), true);
    assert.equal(sql(`select count(*) from private.hangout_disables where hangout_id='${hid(n)}'`), "1");
    const m = i + 5;
    await race(`source_first_${i}`, writers[i](m), disable(m), false);
    assert.equal(sql(`select count(*) from private.hangout_disables where hangout_id='${hid(m)}'`), "1");
  }
  await race("gate_first", "update private.moderation_feature_gate set enabled=false;",
    disable(9), true);
  sql("update private.moderation_feature_gate set enabled=true");
  await race("role_first", `delete from public.platform_roles where user_id='${operator}';`,
    disable(9), true);
  sql(`insert into public.platform_roles(user_id,role) values('${operator}','moderator')`);
  await race("account_first", `update public.accounts set status='suspended'
    where id='${operator}';`, disable(9), true);
  sql(`update public.accounts set status='active' where id='${operator}'`);
  await race("action_first", disable(9),
    `update private.moderation_feature_gate set enabled=false;`, false);
  assert.throws(() => sql(`begin; ${disable(9)} rollback;`), /Moderation unavailable/,
    "replay denied after gate revocation");
  sql("update private.moderation_feature_gate set enabled=true");
  await race("two_operators", disable(10), `${claim(second)}
    select * from public.apply_hangout_moderation_action('${rid(10)}',
      '${key(210)}',1,'Competing');`, true);
  assert.equal(sql(`select count(*) from private.hangout_disables where hangout_id='${hid(10)}'`), "1");
  assert.equal(sql(`select count(*) from private.moderation_audit where hangout_disable_id is not null`), "10");
  // Immutable evidence is removed only by the caller's final disposable reset.
});

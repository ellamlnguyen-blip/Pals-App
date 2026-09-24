import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Disposable local overlapping SQL sessions. Final database reset removes
// immutable sanction and audit fixtures.
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
  "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (input) => execFileSync("docker", args, { input, encoding: "utf8" }).trim();
const id = {
  operator: "53200000-0000-4000-8000-000000000001",
  reporter: "53200000-0000-4000-8000-000000000002",
  first: "53200000-0000-4000-8000-000000000003",
  second: "53200000-0000-4000-8000-000000000004",
  third: "53200000-0000-4000-8000-000000000005",
  fourth: "53200000-0000-4000-8000-000000000006",
  fifth: "53200000-0000-4000-8000-000000000007",
  sixth: "53200000-0000-4000-8000-000000000008",
  seventh: "53200000-0000-4000-8000-000000000009",
  eighth: "53200000-0000-4000-8000-000000000010",
  report1: "53200000-0000-4000-8002-000000000001",
  report2: "53200000-0000-4000-8002-000000000002",
  report3: "53200000-0000-4000-8002-000000000003",
  report4: "53200000-0000-4000-8002-000000000004",
  report5: "53200000-0000-4000-8002-000000000005",
  report6: "53200000-0000-4000-8002-000000000006",
  report7: "53200000-0000-4000-8002-000000000007",
  report8: "53200000-0000-4000-8002-000000000008",
};
const claim = (user) => `set local role authenticated;
  set local request.jwt.claims='{"sub":"${user}","role":"authenticated"}';`;
const sanction = (report, request, revision = 1) => `${claim(id.operator)}
  select * from public.apply_account_moderation_action('${report}',
    '${request}',${revision},'suspend','Local decision');`;
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
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, diagnostic) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    diagnostic();
    await pause(25);
  }
  throw Error("database lock wait was not observed");
}
let sequence = 0;
async function race(label, leaderSql, waiterSql, waiterFails) {
  const tag = `account_enforcement_${++sequence}_${label}`;
  const leader = session(`${tag}_leader`), waiter = session(`${tag}_waiter`);
  try {
    leader.send(`begin; ${leaderSql} select 'leader_ready';`);
    await until(() => leader.output().includes("leader_ready"), () => {
      if (leader.code() !== null || /ERROR:/.test(leader.output()))
        assert.fail(`${label} leader: ${leader.output()}`);
    });
    waiter.send(`begin; ${waiterSql} commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity
      where application_name='${tag}_waiter' and wait_event_type='Lock'`) === "1",
    () => {
      if (waiter.code() !== null || /ERROR:/.test(waiter.output()))
        assert.fail(`${label} waiter: ${waiter.output()}`);
    });
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    const [left, right] = await Promise.all([leader.done, waiter.done]);
    assert.equal(left[0], 0, leader.output());
    assert.equal(right[0], waiterFails ? 3 : 0, waiter.output());
    if (waiterFails) assert.match(waiter.output(), /unavailable/i);
  } finally { leader.child.kill(); waiter.child.kill(); }
}

test("sanctions serialize with live role, target status and direct profile writes", {
  concurrency: false, timeout: 120_000,
}, async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${id.operator}','b1-race-operator@unc.edu',now()),
    ('${id.reporter}','b1-race-reporter@unc.edu',now()),
    ('${id.first}','b1-race-first@unc.edu',now()),
    ('${id.second}','b1-race-second@unc.edu',now()),
    ('${id.third}','b1-race-third@unc.edu',now()),
    ('${id.fourth}','b1-race-fourth@unc.edu',now()),
    ('${id.fifth}','b1-race-fifth@unc.edu',now()),
    ('${id.sixth}','b1-race-sixth@unc.edu',now()),
    ('${id.seventh}','b1-race-seventh@unc.edu',now()),
    ('${id.eighth}','b1-race-eighth@unc.edu',now());
    insert into public.platform_roles(user_id,role) values ('${id.operator}','admin');
    insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
      provenance_kind,provenance_ref_id) values
      ('${id.report1}','${id.reporter}','user','${id.first}','harassment',
        'current_people','${id.first}'),
      ('${id.report2}','${id.reporter}','user','${id.second}','harassment',
        'current_people','${id.second}'),
      ('${id.report3}','${id.reporter}','user','${id.third}','harassment',
        'current_people','${id.third}'),
      ('${id.report4}','${id.reporter}','user','${id.fourth}','harassment',
        'current_people','${id.fourth}'),
      ('${id.report5}','${id.reporter}','user','${id.fifth}','harassment',
        'current_people','${id.fifth}'),
      ('${id.report6}','${id.reporter}','user','${id.sixth}','harassment',
        'current_people','${id.sixth}'),
      ('${id.report7}','${id.reporter}','user','${id.seventh}','harassment',
        'current_people','${id.seventh}'),
      ('${id.report8}','${id.reporter}','user','${id.eighth}','harassment',
        'current_people','${id.eighth}');
    update public.universities set allowed_email_domains=array['unc.edu']
      where slug='unc-chapel-hill';
    update public.university_memberships set verified_at=now(),
      verification_email=(select email from auth.users where id=user_id)
      where user_id in ('${id.third}','${id.fourth}');
    insert into storage.objects(bucket_id,name,owner_id) values
      ('profile-photos','${id.third}/third.png','${id.third}'),
      ('profile-photos','${id.fourth}/fourth.png','${id.fourth}');
    insert into private.friendships(low_id,high_id,requester_id,campus_id,
      generation_id,state) values
      ('${id.reporter}','${id.seventh}','${id.reporter}',
        (select id from public.universities where slug='unc-chapel-hill'),
        '53200000-0000-4000-8005-000000000001','accepted'),
      ('${id.reporter}','${id.eighth}','${id.reporter}',
        (select id from public.universities where slug='unc-chapel-hill'),
        '53200000-0000-4000-8005-000000000002','accepted');
    update private.moderation_feature_gate set enabled=true;
    update private.notification_feature_gate set enabled=true;
    update private.friendship_feature_gate set enabled=true;`);
  for (const [report, request] of [[id.report1, "53200000-0000-4000-8003-000000000001"],
    [id.report2, "53200000-0000-4000-8003-000000000002"],
    [id.report3, "53200000-0000-4000-8003-000000000008"],
    [id.report4, "53200000-0000-4000-8003-000000000009"],
    [id.report5, "53200000-0000-4000-8003-000000000012"],
    [id.report6, "53200000-0000-4000-8003-000000000013"],
    [id.report7, "53200000-0000-4000-8003-000000000016"],
    [id.report8, "53200000-0000-4000-8003-000000000017"]]) {
    sql(`begin; ${claim(id.operator)} select * from public.transition_moderation_case(
      '${report}','${request}',0,'start_review'); commit;`);
  }
  await race("gate_first", "update private.moderation_feature_gate set enabled=false;",
    sanction(id.report1, "53200000-0000-4000-8003-000000000003"), true);
  sql("update private.moderation_feature_gate set enabled=true");
  await race("role_first", `delete from public.platform_roles where user_id='${id.operator}';`,
    sanction(id.report1, "53200000-0000-4000-8003-000000000004"), true);
  sql(`insert into public.platform_roles(user_id,role) values ('${id.operator}','admin')`);
  await race("target_role_first", `insert into public.platform_roles(user_id,role)
    values ('${id.first}','moderator');`,
  sanction(id.report1, "53200000-0000-4000-8003-000000000005"), true);
  sql(`delete from public.platform_roles where user_id='${id.first}'`);
  await race("sanction_first", sanction(id.report1,
    "53200000-0000-4000-8003-000000000006"),
  `${claim(id.first)} update public.profiles set bio='Too late' where user_id='${id.first}';`,
  true);
  assert.equal(sql(`select status from public.accounts where id='${id.first}'`), "suspended");
  assert.equal(sql(`select bio is null from public.profiles where user_id='${id.first}'`), "t");
  await race("profile_first", `${claim(id.second)} update public.profiles
    set bio='Admitted first' where user_id='${id.second}';`,
  sanction(id.report2, "53200000-0000-4000-8003-000000000007"), false);
  assert.equal(sql(`select bio from public.profiles where user_id='${id.second}'`),
    "Admitted first");
  assert.equal(sql(`select status from public.accounts where id='${id.second}'`),
    "suspended");
  await race("sanction_before_storage", sanction(id.report3,
    "53200000-0000-4000-8003-000000000010"),
  `${claim(id.third)} set local storage.allow_delete_query='true';
    delete from storage.objects where bucket_id='profile-photos'
      and name='${id.third}/third.png';`, true);
  assert.equal(sql(`select count(*) from storage.objects where bucket_id='profile-photos'
    and name='${id.third}/third.png'`), "1", "sanction-first photo stays private");
  await race("storage_before_sanction", `${claim(id.fourth)}
    set local storage.allow_delete_query='true';
    delete from storage.objects where bucket_id='profile-photos'
      and name='${id.fourth}/fourth.png';`,
  sanction(id.report4, "53200000-0000-4000-8003-000000000011"), false);
  assert.equal(sql(`select count(*) from storage.objects where bucket_id='profile-photos'
    and name='${id.fourth}/fourth.png'`), "0", "admitted photo delete commits first");
  await race("sanction_before_preference", sanction(id.report5,
    "53200000-0000-4000-8003-000000000014"),
  `${claim(id.fifth)} select public.set_notification_preference('messages',false);`, true);
  assert.equal(sql(`select count(*) from private.notification_preferences
    where recipient_id='${id.fifth}'`), "0", "sanction-first preference denied");
  await race("preference_before_sanction", `${claim(id.sixth)}
    select public.set_notification_preference('messages',false);`,
  sanction(id.report6, "53200000-0000-4000-8003-000000000015"), false);
  assert.equal(sql(`select enabled from private.notification_preferences
    where recipient_id='${id.sixth}' and category='messages'`), "f",
  "admitted preference commits first");
  await race("sanction_before_unfriend", sanction(id.report7,
    "53200000-0000-4000-8003-000000000018"),
  `${claim(id.seventh)} select public.unfriend('${id.reporter}',
    '53200000-0000-4000-8005-000000000001');`, true);
  assert.equal(sql(`select count(*) from private.friendships
    where high_id='${id.seventh}'`), "1", "sanction-first cleanup denied");
  await race("unfriend_before_sanction", `${claim(id.eighth)}
    select public.unfriend('${id.reporter}',
      '53200000-0000-4000-8005-000000000002');`,
  sanction(id.report8, "53200000-0000-4000-8003-000000000019"), false);
  assert.equal(sql(`select count(*) from private.friendships
    where high_id='${id.eighth}'`), "0", "admitted cleanup commits first");
  assert.equal(sql(`select count(*) from private.account_sanctions
    where report_id in ('${id.report1}','${id.report2}',
      '${id.report3}','${id.report4}',
      '${id.report5}','${id.report6}',
      '${id.report7}','${id.report8}')`), "8");
  assert.equal(sql(`select count(*) from private.moderation_audit
    where sanction_id is not null and report_id in
      ('${id.report1}','${id.report2}',
       '${id.report3}','${id.report4}',
       '${id.report5}','${id.report6}',
       '${id.report7}','${id.report8}')`), "8");
  sql("update private.notification_feature_gate set enabled=false");
  sql("update private.friendship_feature_gate set enabled=false");
  sql("update private.moderation_feature_gate set enabled=false");
});

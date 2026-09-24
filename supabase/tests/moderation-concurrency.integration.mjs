import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Disposable local overlapping SQL sessions; each claimed wait is observed.
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
  "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (input) => execFileSync("docker", args, { input, encoding: "utf8" }).trim();
const actor = "52000000-0000-4000-8000-000000000001";
const reporter = "52000000-0000-4000-8000-000000000002";
const target = "52000000-0000-4000-8000-000000000003";
const second = "52000000-0000-4000-8000-000000000004";
const report = "52000000-0000-4000-8002-000000000001";
const report2 = "52000000-0000-4000-8002-000000000002";
const report3 = "52000000-0000-4000-8002-000000000004";
const hangout = "52000000-0000-4000-8004-000000000001";
const hangoutReport = "52000000-0000-4000-8002-000000000003";
const claims = `set local role authenticated;
  set local request.jwt.claims='{"sub":"${actor}","role":"authenticated"}';`;
const secondClaims = `set local role authenticated;
  set local request.jwt.claims='{"sub":"${second}","role":"authenticated"}';`;
const detail = `select count(*) from public.get_moderation_report('${report}');`;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, diagnostic) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    diagnostic?.();
    await pause(25);
  }
  diagnostic?.();
  throw Error("database wait was not observed");
}
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
let seq = 0;
async function race(label, leaderSql, waiterSql, waiterFails) {
  const tag = `moderation_${++seq}_${label}`;
  const leader = session(`${tag}_leader`);
  const waiter = session(`${tag}_waiter`);
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
    const [l, w] = await Promise.all([leader.done, waiter.done]);
    assert.equal(l[0], 0, leader.output());
    assert.equal(w[0], waiterFails ? 3 : 0, waiter.output());
    if (waiterFails) assert.match(waiter.output(), /Moderation unavailable/);
  } finally { leader.child.kill(); waiter.child.kill(); }
}

test("moderation read and revocation observe both committed lock orders", {
  concurrency: false, timeout: 120_000,
}, async () => {
  try {
    sql(`insert into auth.users(id,email,email_confirmed_at) values
      ('${actor}','moderation-race-1@unc.edu',now()),
      ('${reporter}','moderation-race-2@unc.edu',now()),
      ('${target}','moderation-race-3@unc.edu',now()),
      ('${second}','moderation-race-4@unc.edu',now());
      insert into public.platform_roles(user_id,role) values
        ('${actor}','moderator'),('${second}','admin');
      insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
        provenance_kind,provenance_ref_id) values
        ('${report}','${reporter}','user','${target}','harassment',
         'current_people','${target}'),
        ('${report2}','${reporter}','user','${target}','harassment',
         'current_people','${target}'),
        ('${report3}','${reporter}','user','${target}','harassment',
         'current_people','${target}');
      begin;
      insert into public.hangouts(id,university_id,host_id,title,starts_at,
        public_place,public_latitude,public_longitude) values
        ('${hangout}',(select id from public.universities where slug='unc-chapel-hill'),
         '${target}','Local fixture',now()+interval '1 hour','Approximate place',35,-79);
      insert into public.hangout_participants(hangout_id,account_id,state)
        values ('${hangout}','${target}','joined');
      commit;
      insert into private.safety_reports(id,reporter_id,target_type,target_id,category,
        provenance_kind,provenance_ref_id,submitted_at) values
        ('${hangoutReport}','${reporter}','hangout','${hangout}','harassment',
         'current_hangout','${hangout}',clock_timestamp()-interval '1 day');
      insert into storage.objects(bucket_id,name,owner_id)
        values ('profile-photos','${actor}/primary.png','${actor}');
      update public.profiles set real_name='Moderation race',major='Science',
        graduation_year=2028,bio='Fixture',primary_photo_path='${actor}/primary.png'
        where user_id='${actor}';
      update private.moderation_feature_gate set enabled=true;
      update private.safety_feature_gate set enabled=true;
      update private.hangout_feature_gate set enabled=true;`);
    assert.throws(() => sql(`begin isolation level repeatable read; ${claims}
      ${detail} rollback;`), /Moderation unavailable/);
    await race("gate_first", "update private.moderation_feature_gate set enabled=false;",
      `${claims} ${detail}`, true);
    sql("update private.moderation_feature_gate set enabled=true");
    await race("read_first", `${claims} ${detail}`,
      "update private.moderation_feature_gate set enabled=false;", false);
    assert.equal(sql(`select count(*) from private.moderation_audit
      where report_id='${report}' and action='detail_read'`), "1");
    sql("update private.moderation_feature_gate set enabled=true");
    await race("role_first", `delete from public.platform_roles where user_id='${actor}';`,
      `${claims} ${detail}`, true);
    sql(`insert into public.platform_roles(user_id,role) values ('${actor}','moderator')`);
    const beforeRoleReadFirst = Number(sql(`select count(*) from private.moderation_audit
      where report_id='${report}' and action='detail_read'`));
    await race("role_read_first", `${claims} ${detail}`,
      `delete from public.platform_roles where user_id='${actor}';`, false);
    assert.equal(Number(sql(`select count(*) from private.moderation_audit
      where report_id='${report}' and action='detail_read'`)),
      beforeRoleReadFirst + 1, "authorized read commits before role deletion");
    assert.throws(() => sql(`begin; ${claims} ${detail} rollback;`),
      /Moderation unavailable/);
    sql(`insert into public.platform_roles(user_id,role) values ('${actor}','moderator')`);
    await race("account_first", `update public.accounts set status='suspended'
      where id='${actor}';`, `${claims} ${detail}`, true);
    sql(`update public.accounts set status='active' where id='${actor}'`);
    const beforeAccountReadFirst = Number(sql(`select count(*) from private.moderation_audit
      where report_id='${report}' and action='detail_read'`));
    await race("account_read_first", `${claims} ${detail}`,
      `update public.accounts set status='suspended' where id='${actor}';`, false);
    assert.equal(Number(sql(`select count(*) from private.moderation_audit
      where report_id='${report}' and action='detail_read'`)),
      beforeAccountReadFirst + 1, "authorized read commits before account suspension");
    assert.throws(() => sql(`begin; ${claims} ${detail} rollback;`),
      /Moderation unavailable/);
    sql(`update public.accounts set status='active' where id='${actor}'`);
    await race("target_role_first",
      `insert into public.platform_roles(user_id,role) values ('${target}','moderator');`,
      `${claims} select * from public.transition_moderation_case('${report}',
        '52000000-0000-4000-8003-000000000001',0,'start_review');`, true);
    sql(`delete from public.platform_roles where user_id='${target}'`);
    await race("case_first", `${claims} select * from public.transition_moderation_case(
      '${report}','52000000-0000-4000-8003-000000000002',0,'start_review');`,
      `insert into public.platform_roles(user_id,role)
        values ('${target}','moderator');`, false);
    const replay = `${claims} select * from public.transition_moderation_case(
      '${report}','52000000-0000-4000-8003-000000000002',0,'start_review');`;
    assert.throws(() => sql(`begin; ${replay} rollback;`), /Moderation unavailable/);
    sql(`delete from public.platform_roles where user_id='${target}'`);
    await race("two_operators", `${claims} select * from public.transition_moderation_case(
      '${report2}','52000000-0000-4000-8003-000000000003',0,'start_review');`,
      `${secondClaims} select * from public.transition_moderation_case(
        '${report2}','52000000-0000-4000-8003-000000000004',0,'start_review');`, true);
    assert.equal(sql(`select revision from private.moderation_cases where
      report_id='${report2}'`), "1");
    const sameKeyAction = `${claims} select * from public.transition_moderation_case(
      '${report3}','52000000-0000-4000-8003-000000000007',0,'start_review');`;
    await race("same_key", sameKeyAction, sameKeyAction, false);
    assert.equal(sql(`select revision from private.moderation_cases where
      report_id='${report3}'`), "1");
    assert.equal(sql(`select count(*) from private.moderation_audit where
      report_id='${report3}' and action='start_review'`), "1");
    const currentHangoutReport = `${claims} select * from public.submit_safety_report(
      '52000000-0000-4000-8003-000000000005','hangout','${hangout}',
      'harassment',null);`;
    const hangoutDetail = `${claims} select * from public.get_moderation_report(
      '${hangoutReport}');`;
    await race("current_report_first", currentHangoutReport, hangoutDetail, false);
    await race("detail_first", hangoutDetail,
      `${claims} select * from public.submit_safety_report(
        '52000000-0000-4000-8003-000000000006','hangout','${hangout}',
        'harassment',null);`, false);
    sql(`insert into public.hangout_participants(hangout_id,account_id,state)
      values ('${hangout}','${actor}','joined')`);
    await race("block_first", `${claims} select public.set_safety_block('${target}',true);`,
      `${claims} select * from public.list_moderation_reports();`, false);
  } finally {
    sql(`update private.moderation_feature_gate set enabled=false;
      update private.safety_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      delete from private.moderation_audit where report_id in
        ('${report}','${report2}','${report3}','${hangoutReport}')
        or array_position(page_report_ids,'${hangoutReport}'::uuid) is not null;
      delete from private.moderation_requests where report_id in
        ('${report}','${report2}','${report3}','${hangoutReport}');
      delete from private.moderation_cases where report_id in
        ('${report}','${report2}','${report3}','${hangoutReport}');
      delete from private.safety_report_requests where reporter_id='${actor}';
      delete from private.safety_reports where id in
        ('${report}','${report2}','${report3}','${hangoutReport}') or reporter_id='${actor}';
      delete from private.people_blocks where blocker_id='${actor}' and blocked_id='${target}';
      delete from public.hangouts where id='${hangout}';
      update public.profiles set primary_photo_path=null where user_id='${actor}';
      set storage.allow_delete_query='true';
      delete from storage.objects where bucket_id='profile-photos'
        and name='${actor}/primary.png';
      delete from public.platform_roles where user_id in ('${actor}','${target}','${second}');
      delete from auth.users where id in ('${actor}','${reporter}','${target}','${second}');`);
  }
});

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { verifiedTotpToken } from "./helpers/local-totp.mjs";

// Disposable local overlapping SQL sessions; each claimed wait is observed.
const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase",
  ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
  "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (input) => execFileSync("docker", args, { input, encoding: "utf8" }).trim();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
async function request(path, token, body) {
  const response = await fetch(`${status.API_URL}${path}`, { method: body ? "POST" : "GET",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`,
      ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null };
}
async function signup() {
  const email = `moderation-race-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await request("/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
  const login = await request("/auth/v1/token?grant_type=password", null,
    { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, email, token: login.body.access_token };
}
function signedClaims(token, expectedId) {
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url"));
  assert.equal(claims.sub, expectedId);
  assert.equal(claims.role, "authenticated");
  assert.equal(claims.aal, "aal2");
  assert.match(claims.session_id, /^[0-9a-f-]{36}$/i);
  return `set local role authenticated;
    set local request.jwt.claims=${quote(JSON.stringify(claims))};`;
}
let actor, reporter, target, second;
const report = "52000000-0000-4000-8002-000000000001";
const report2 = "52000000-0000-4000-8002-000000000002";
const report3 = "52000000-0000-4000-8002-000000000004";
const hangout = "52000000-0000-4000-8004-000000000001";
const hangoutReport = "52000000-0000-4000-8002-000000000003";
let claims, secondClaims;
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
  const users = [];
  try {
    for (let i = 0; i < 4; i++) users.push(await signup());
    [actor, reporter, target, second] = users.map((user) => user.id);
    sql(`insert into public.platform_roles(user_id,role) values
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
        values ('profile-photos','${actor}/a11a.png','${actor}'),
          ('profile-photos','${target}/b22b.png','${target}');
      update public.profiles set real_name='Moderation race',major='Science',
        graduation_year=2028,bio='Fixture',primary_photo_path='${actor}/a11a.png'
        where user_id='${actor}';
      update public.profiles set real_name='Hangout host',major='Science',
        graduation_year=2028,bio='Fixture',primary_photo_path='${target}/b22b.png'
        where user_id='${target}';
      update private.moderation_feature_gate set enabled=true;
      update private.safety_feature_gate set enabled=true;
      update private.hangout_feature_gate set enabled=true;
    update private.pilot_availability set enabled=true;
    update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts','people');`);
    users[0].token = await verifiedTotpToken(request, users[0].token);
    users[3].token = await verifiedTotpToken(request, users[3].token);
    for (const user of [users[0], users[3]]) {
      const verified = await request("/auth/v1/user", user.token);
      assert.equal(verified.status, 200, JSON.stringify(verified.body));
      assert.equal(verified.body.id, user.id);
    }
    claims = signedClaims(users[0].token, actor);
    secondClaims = signedClaims(users[3].token, second);
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
    await race("membership_delete_first",
      `delete from public.university_memberships where user_id='${target}';`,
      `${claims} select * from public.transition_moderation_case(
        '${report2}','52000000-0000-4000-8003-000000000008',1,'annotate',
        'Campus unavailable');`, false);
    assert.equal(sql(`select subject_campus_id is null from private.moderation_audit
      where request_id='52000000-0000-4000-8003-000000000008'`), "t",
      "membership deletion commits before audit campus lookup");
    sql(`insert into public.university_memberships(user_id,university_id,verified_at,
      verification_email) values ('${target}',
      (select id from public.universities where slug='unc-chapel-hill'),now(),
      '${users[2].email}');`);
    await race("action_before_membership_delete",
      `${claims} select * from public.transition_moderation_case(
        '${report2}','52000000-0000-4000-8003-000000000009',2,'annotate',
        'Current campus');`,
      `delete from public.university_memberships where user_id='${target}';`, false);
    assert.equal(sql(`select subject_campus_id is not null from private.moderation_audit
      where request_id='52000000-0000-4000-8003-000000000009'`), "t",
      "action holds current membership through commit before deletion");
    sql(`insert into public.university_memberships(user_id,university_id,verified_at,
      verification_email) values ('${target}',
      (select id from public.universities where slug='unc-chapel-hill'),now(),
      '${users[2].email}');`);
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
    const hangoutReportTimestamp = sql(`select submitted_at from private.safety_reports
      where id='${hangoutReport}'`);
    const focusedModerationPage = `${claims} select * from public.list_moderation_reports(
      '${hangoutReportTimestamp}'::timestamptz,
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,24);`;
    await race("block_first", `${claims} select public.set_safety_block('${target}',true);`,
      focusedModerationPage, false);
  } finally {
    if (users.length < 4) {
      if (users.length) sql(`delete from auth.users where id in
        (${users.map((user) => quote(user.id)).join(",")})`);
    } else {
      sql(`update private.pilot_capabilities set enabled=false where key in ('onboarding','hangouts','people');
      update private.pilot_availability set enabled=false;`);
      sql(`update private.moderation_feature_gate set enabled=false;
      update private.safety_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      -- Audit is append-only after TASK-017B1; the final disposable reset
      -- clears these local audit fixtures.
      delete from private.moderation_requests where report_id in
        ('${report}','${report2}','${report3}','${hangoutReport}');
      delete from private.moderation_cases where report_id in
        ('${report}','${report2}','${report3}','${hangoutReport}');
      delete from private.safety_report_requests where reporter_id='${actor}';
      delete from private.safety_reports where id in
        ('${report}','${report2}','${report3}','${hangoutReport}') or reporter_id='${actor}';
      delete from private.people_blocks where blocker_id='${actor}' and blocked_id='${target}';
      delete from public.hangouts where id='${hangout}';
      update public.profiles set primary_photo_path=null
        where user_id in ('${actor}','${target}');
      set storage.allow_delete_query='true';
      delete from storage.objects where bucket_id='profile-photos'
        and name in ('${actor}/a11a.png','${target}/b22b.png');
      delete from public.platform_roles where user_id in ('${actor}','${target}','${second}');
      delete from auth.users where id in (${users.map((user) => quote(user.id)).join(",")});`);
    }
  }
});

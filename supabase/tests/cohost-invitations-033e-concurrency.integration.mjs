import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Run only against the named disposable TASK-029 database after the reviewed
// D2 and E migrations. Never default this script to production or staging.
const container = process.env.PALS_TASK033_DB_CONTAINER;
if (!container || !container.includes("task029")) {
  throw new Error("Set PALS_TASK033_DB_CONTAINER to the named TASK-029 disposable database container");
}
const args = ["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (query) => execFileSync("docker", args, { input: query, encoding: "utf8" }).trim();
const host = "533e1000-0000-4000-8000-000000000001";
const peer = "533e1000-0000-4000-8000-000000000002";
const hangout = "533e1000-0000-4000-8001-000000000001";
const invite = "533e1000-0000-4000-8002-000000000001";
const secondInvite = "533e1000-0000-4000-8002-000000000002";
const thirdInvite = "533e1000-0000-4000-8002-000000000003";
const fourthInvite = "533e1000-0000-4000-8002-000000000004";
const claim = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (v) => { output += v; });
  child.stderr.on("data", (v) => { output += v; });
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output, done: once(child, "exit") };
}
async function until(check) {
  for (let n = 0; n < 200; n++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Observed invitation race did not reach expected state");
}
async function race(name, leader, waiter, expectedError) {
  const first = session(`${name}_leader`);
  const second = session(`${name}_waiter`);
  try {
    first.send(`begin; ${leader} select 'held';`);
    await until(() => first.output().includes("held"));
    second.send(`begin; ${waiter} select 'waited'; commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}_waiter' and wait_event_type='Lock'`) === "1");
    first.send("commit;"); first.child.stdin.end(); second.child.stdin.end();
    await first.done; await second.done;
    assert.match(second.output(), expectedError);
    assert.doesNotMatch(second.output(), /waited/);
  } finally { first.child.kill(); second.child.kill(); }
}

test("invitation accept and withdraw serialize with one terminal outcome", { timeout: 120_000 }, async () => {
  sql(`begin;
    update private.pilot_availability set enabled=true where singleton;
    update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts');
    update private.hangout_feature_gate set enabled=true where singleton;
    insert into auth.users(id,email,email_confirmed_at) values
     ('${host}','cohost033e-race-host@unc.edu',now()),
     ('${peer}','cohost033e-race-peer@unc.edu',now());
    insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
     values('${hangout}','00000000-0000-4000-8000-000000000001','${host}','Invite race',now()+interval '2 hours','Area',35,-79);
    insert into public.hangout_participants(hangout_id,account_id,state)
     values('${hangout}','${host}','joined'),('${hangout}','${peer}','joined');
    insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id)
     values('${invite}','${hangout}','${host}','${peer}',gen_random_uuid());
    commit;`);
  try {
    await race("cohost033e_withdraw_wins",
      `${claim(host)} select public.withdraw_hangout_cohost_invitation('${invite}',1);`,
      `${claim(peer)} select public.respond_hangout_cohost_invitation('${invite}',true,2);`,
      /Invitation unavailable/);
    assert.equal(sql(`select state from private.cohost_invitations where id='${invite}'`), "withdrawn");
    assert.equal(sql(`select count(*) from private.hangout_cohosts where hangout_id='${hangout}' and account_id='${peer}'`), "0");
    sql(`insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id)
      values('${secondInvite}','${hangout}','${host}','${peer}',gen_random_uuid())`);
    await race("cohost033e_accept_wins",
      `${claim(peer)} select public.respond_hangout_cohost_invitation('${secondInvite}',true,2);`,
      `${claim(host)} select public.withdraw_hangout_cohost_invitation('${secondInvite}',3);`,
      /Invitation unavailable/);
    assert.equal(sql(`select state from private.cohost_invitations where id='${secondInvite}'`), "accepted");
    assert.equal(sql(`select count(*) from private.hangout_cohosts where hangout_id='${hangout}' and account_id='${peer}'`), "1");
    sql(`begin; ${claim(host)} select public.demote_hangout_cohost('${hangout}','${peer}',3); commit;`);
    sql(`insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id)
      values('${thirdInvite}','${hangout}','${host}','${peer}',gen_random_uuid())`);
    await race("cohost033e_gate_disable_wins",
      `update private.hangout_feature_gate set enabled=false where singleton;`,
      `${claim(peer)} select public.respond_hangout_cohost_invitation('${thirdInvite}',true,4);`,
      /Invitation unavailable|Hangout operation not permitted/);
    assert.equal(sql(`select state from private.cohost_invitations where id='${thirdInvite}'`), "unavailable");
    sql(`update private.hangout_feature_gate set enabled=true where singleton;`);
    sql(`insert into private.cohost_invitations(id,hangout_id,host_id,recipient_id,request_id)
      values('${fourthInvite}','${hangout}','${host}','${peer}',gen_random_uuid())`);
    await race("cohost033e_departure_wins",
      `${claim(peer)} select public.leave_hangout('${hangout}');`,
      `${claim(peer)} select public.respond_hangout_cohost_invitation('${fourthInvite}',true,5);`,
      /Invitation unavailable/);
    assert.equal(sql(`select state from private.cohost_invitations where id='${fourthInvite}'`), "unavailable");
  } finally {
    sql(`begin;
      delete from private.notification_items where recipient_id in ('${host}','${peer}');
      delete from private.cohost_invitations where hangout_id='${hangout}';
      delete from private.hangout_cohosts where hangout_id='${hangout}';
      delete from public.hangout_participants where hangout_id='${hangout}';
      delete from public.hangouts where id='${hangout}';
      delete from auth.users where id in ('${host}','${peer}');
      commit;`);
  }
});

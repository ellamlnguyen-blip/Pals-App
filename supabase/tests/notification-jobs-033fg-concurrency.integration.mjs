import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Named disposable TASK-029 only. No gate changes, hosted access or reset.
const container = process.env.PALS_TASK033_DB_CONTAINER;
if (!container || !container.includes("task029")) {
  throw new Error("Set PALS_TASK033_DB_CONTAINER to the named TASK-029 disposable database container");
}
const args = ["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const sql = (query) => execFileSync("docker", args, { input: query, encoding: "utf8" }).trim();
const host = "633f1000-0000-4000-8000-000000000001";
const recipient = "633f1000-0000-4000-8000-000000000002";
const hangout = "633f1000-0000-4000-8001-000000000001";
const secondHangout = "633f1000-0000-4000-8001-000000000002";
const reminderHangout = "633f1000-0000-4000-8001-000000000003";
const dualHangout = "633f1000-0000-4000-8001-000000000004";
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
  throw new Error("Notification race did not reach the expected lock wait");
}
async function race(name, leaderSql, waiterSql) {
  const leader = session(`${name}_leader`);
  const waiter = session(`${name}_waiter`);
  try {
    leader.send(`begin; ${leaderSql} select 'held';`);
    await until(() => leader.output().includes("held"));
    waiter.send(`begin; ${waiterSql} select 'delivered'; commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}_waiter' and wait_event_type='Lock'`) === "1");
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    await leader.done; await waiter.done;
    assert.match(waiter.output(), /delivered/);
    assert.doesNotMatch(waiter.output(), /ERROR/);
  } finally { leader.child.kill(); waiter.child.kill(); }
}

test("source cancellation and recipient mute win before optional delivery", { timeout: 120_000 }, async () => {
  assert.equal(sql(`select private.hangouts_enabled() and private.notification_enabled()
    and private.pilot_capability_enabled('hangouts')`), "t", "named disposable gates must already be enabled");
  sql(`begin;
    insert into auth.users(id,email,email_confirmed_at) values
     ('${host}','jobs033fg-race-host@unc.edu',now()),
     ('${recipient}','jobs033fg-race-recipient@unc.edu',now());
    insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
     values
      ('${hangout}','00000000-0000-4000-8000-000000000001','${host}',
       'Notification race one',now()+interval '2 hours','Area',35,-79),
      ('${secondHangout}','00000000-0000-4000-8000-000000000001','${host}',
       'Notification race two',now()+interval '2 hours','Area',35,-79),
      ('${reminderHangout}','00000000-0000-4000-8000-000000000001','${host}',
       'Reminder race',now()+interval '30 minutes','Area',35,-79),
      ('${dualHangout}','00000000-0000-4000-8000-000000000001','${host}',
       'Dual worker race',now()+interval '2 hours','Area',35,-79);
    insert into public.hangout_participants(hangout_id,account_id,state)
     values('${hangout}','${host}','joined'),('${secondHangout}','${host}','joined'),
      ('${reminderHangout}','${host}','joined'),('${dualHangout}','${host}','joined');
    insert into private.notification_preferences(recipient_id,category,enabled,enabled_at)
     values('${recipient}','campus_new_hangout',true,now()-interval '1 hour');
    update private.notification_actions set cursor_id='${host}' where hangout_id in ('${hangout}','${secondHangout}','${dualHangout}');
    update private.notification_actions set finished_at=clock_timestamp() where hangout_id='${reminderHangout}';
    update private.notification_reminder_occurrences set finished_at=clock_timestamp()
      where hangout_id='${reminderHangout}';
    commit;`);
  const action = sql(`select id from private.notification_actions where hangout_id='${hangout}' and action_kind='created'`);
  const secondAction = sql(`select id from private.notification_actions where hangout_id='${secondHangout}' and action_kind='created'`);
  const dualAction = sql(`select id from private.notification_actions where hangout_id='${dualHangout}' and action_kind='created'`);
  const reminderOccurrence = sql(`select id from private.notification_reminder_occurrences
    where hangout_id='${reminderHangout}'`);
  try {
    // The worker waits on the source row, then observes cancellation.
    await race("jobs033fg_cancel_wins",
      `update public.hangouts set status='cancelled',joining_state='closed',revision=revision+1 where id='${hangout}';`,
      `select private.run_notification_jobs(1);`);
    assert.equal(sql(`select count(*) from private.notification_items where source_id='${action}' and recipient_id='${recipient}'`), "0");
    assert.equal(sql(`select finished_at is not null from private.notification_actions where id='${action}'`), "t");
    // The recipient lock orders an optional preference write before delivery.
    await race("jobs033fg_mute_wins",
      `select private.notification_lock_recipient('${recipient}');
       update private.notification_preferences set enabled=false,enabled_at=null
       where recipient_id='${recipient}' and category='campus_new_hangout';`,
      `select private.run_notification_jobs(1);`);
    assert.equal(sql(`select count(*) from private.notification_items where source_id='${secondAction}' and recipient_id='${recipient}'`), "0");
    assert.equal(sql(`select cursor_id from private.notification_actions where id='${secondAction}'`), recipient);
    // Remove the future dual-worker action from this phase's queue.
    sql(`update private.notification_actions set finished_at=clock_timestamp()
      where id in ('${secondAction}','${dualAction}');
      update private.notification_reminder_occurrences set finished_at=null
      where id='${reminderOccurrence}';`);
    await race("jobs033fg_reschedule_wins",
      `update public.hangouts set starts_at=now()+interval '3 hours',revision=revision+1
       where id='${reminderHangout}';`,
      `select private.run_notification_jobs(1);`);
    assert.equal(sql(`select count(*) from private.notification_items where source_id='${reminderOccurrence}'`), "0");
    // A new source action is the only eligible action; hold its source row while
    // the first worker owns the queue row, then observe the second worker skip it.
    sql(`update private.notification_preferences set enabled=true,enabled_at=now()-interval '1 hour'
      where recipient_id='${recipient}' and category='campus_new_hangout';
      update private.notification_reminder_occurrences set finished_at=clock_timestamp()
      where hangout_id='${reminderHangout}';
      update private.notification_actions set finished_at=null where id='${dualAction}';`);
    const leader = session("jobs033fg_dual_source");
    const first = session("jobs033fg_dual_first");
    try {
      leader.send(`begin; select 1 from public.hangouts where id='${dualHangout}' for update; select 'held';`);
      await until(() => leader.output().includes("held"));
      first.send("begin; select private.run_notification_jobs(1); select 'first_done'; commit;");
      await until(() => sql(`select count(*) from pg_stat_activity
        where application_name='jobs033fg_dual_first' and wait_event_type='Lock'`) === "1");
      assert.equal(sql("select private.run_notification_jobs(1)"), "0", "second worker skips locked action");
      leader.send("commit;"); leader.child.stdin.end(); first.child.stdin.end();
      await leader.done; await first.done;
      assert.match(first.output(), /first_done/);
      assert.equal(sql(`select count(*) from private.notification_items where source_id='${dualAction}'
        and recipient_id='${recipient}'`), "1", "one row after competing workers");
      sql("select private.run_notification_jobs(100)");
      assert.equal(sql(`select count(*) from private.notification_items where source_id='${dualAction}'
        and recipient_id='${recipient}'`), "1", "retry keeps one row");
    } finally { leader.child.kill(); first.child.kill(); }
  } finally {
    sql(`begin;
      delete from private.notification_items where target_id in ('${hangout}','${secondHangout}','${reminderHangout}','${dualHangout}');
      delete from private.notification_late_joins where occurrence_id in
       (select id from private.notification_reminder_occurrences where hangout_id in ('${hangout}','${secondHangout}','${reminderHangout}','${dualHangout}'));
      delete from private.notification_actions where hangout_id in ('${hangout}','${secondHangout}','${reminderHangout}','${dualHangout}');
      delete from private.notification_reminder_occurrences where hangout_id in ('${hangout}','${secondHangout}','${reminderHangout}','${dualHangout}');
      delete from public.hangout_participants where hangout_id in ('${hangout}','${secondHangout}','${reminderHangout}','${dualHangout}');
      delete from public.hangouts where id in ('${hangout}','${secondHangout}','${reminderHangout}','${dualHangout}');
      delete from auth.users where id in ('${host}','${recipient}');
      commit;`);
  }
});

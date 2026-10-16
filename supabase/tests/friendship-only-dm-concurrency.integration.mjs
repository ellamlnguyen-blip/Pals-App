// TASK-039B. Only the isolated database inside the named disposable container.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
const container = "supabase_db_pals-task029-disposable";
const database = "pals_task039b";
const args = ["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-d", database, "-v", "ON_ERROR_STOP=1"];
const a = "39100000-0000-4000-8000-000000000001";
const b = "39100000-0000-4000-8000-000000000002";
const oldPair = "49100000-0000-4000-8000-000000000001";
function sql(q) { return execFileSync("docker", args, { input: `${q}\n`, encoding: "utf8" }).trim(); }
function claims(id) { return `set local role authenticated; select set_config('request.jwt.claims','{"sub":"${id}","role":"authenticated"}',true);`; }
function session(name) {
 const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
 let out = "", err = "";
 child.stdout.on("data", x => out += x);
 child.stderr.on("data", x => err += x);
 child.stdin.write(`set application_name='${name}';\n`);
 return { child, send: q => child.stdin.write(`${q}\n`), out: () => out, err: () => err,
  done: new Promise(resolve => child.on("close", resolve)) };
}
async function until(f) { for (let i = 0; i < 200; i++) { if (f()) return; await new Promise(r => setTimeout(r, 25)); } throw new Error("race barrier timed out"); }
async function waiting(name) { await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`) === "1"); }
function prepare() {
 sql(`insert into private.pilot_availability(singleton,enabled,revision) values(true,true,1);
 insert into private.pilot_capabilities(key,enabled,revision) values ('onboarding',true,1),('people',true,1),('friendship',true,1),('dm',true,1);
 insert into private.people_feature_gate values(true,true);
 insert into private.friendship_feature_gate values(true,true);
 insert into private.dm_feature_gate values(true,true);
 update public.profiles set real_name='Synthetic Student',major='Biology',graduation_year=2028,bio='Race fixture' where user_id in ('${a}','${b}');
 insert into private.people_preferences(account_id,opted_in) values ('${a}',true),('${b}',true);`);
 assert.equal(sql(`select state from private.dm_pairs where generation_id='${oldPair}'`), "accepted");
}
async function teardownFirst() {
 const friend = sql(`select generation_id from private.friendships where low_id='${a}' and high_id='${b}'`);
 const unfriend = session("task039b_unfriend_first"), send = session("task039b_send_after_unfriend");
 unfriend.send(`begin; ${claims(a)} select public.transition_friendship('${b}','${friend}','unfriend'); select 'UNFRIEND_HELD';`);
 await until(() => unfriend.out().includes("UNFRIEND_HELD"));
 send.send(`begin; ${claims(b)} select public.send_dm_message('${a}','${oldPair}','${randomUUID()}','late text'); commit;`);
 await waiting("task039b_send_after_unfriend");
 unfriend.send("commit;"); unfriend.child.stdin.end(); send.child.stdin.end();
 assert.equal(await unfriend.done, 0, unfriend.err());
 assert.notEqual(await send.done, 0, "send after teardown must fail");
 assert.match(send.err(), /DM unavailable/);
 assert.equal(sql(`select state from private.dm_pairs where generation_id='${oldPair}'`), "retired");
 assert.equal(sql(`begin; ${claims(b)} select count(*) from public.read_dm_messages('${a}','${oldPair}'); commit;`).split("\n").find(x => x === "0"), "0");
}
async function sendFirst() {
 sql(`insert into private.friendships(low_id,high_id,requester_id,campus_id,state)
 values('${a}','${b}','${a}','00000000-0000-4000-8000-000000000001','accepted');`);
 const fresh = sql(`begin; ${claims(a)} select generation_id from public.send_friend_dm_message('${b}','${randomUUID()}','fresh text'); commit;`).split("\n").find(x => /^[0-9a-f-]{36}$/.test(x));
 assert.ok(fresh && fresh !== oldPair);
 const friend = sql(`select generation_id from private.friendships where low_id='${a}' and high_id='${b}'`);
 const send = session("task039b_send_first"), unfriend = session("task039b_unfriend_after_send");
 const key = randomUUID();
 send.send(`begin; ${claims(a)} select public.send_dm_message('${b}','${fresh}','${key}','before teardown'); select 'SEND_HELD';`);
 await until(() => send.out().includes("SEND_HELD"));
 unfriend.send(`begin; ${claims(b)} select public.transition_friendship('${a}','${friend}','unfriend'); commit;`);
 await waiting("task039b_unfriend_after_send");
 send.send("commit;"); send.child.stdin.end(); unfriend.child.stdin.end();
 assert.equal(await send.done, 0, send.err()); assert.equal(await unfriend.done, 0, unfriend.err());
 assert.equal(sql(`select state from private.dm_pairs where generation_id='${fresh}'`), "retired");
 assert.equal(sql(`select count(*) from private.dm_messages where generation_id='${fresh}'`), "2");
 let denied = false;
 try { sql(`begin; ${claims(a)} select public.send_dm_message('${b}','${fresh}','${key}','before teardown'); commit;`); }
 catch (e) { denied = /DM unavailable/.test(String(e.stderr)); }
 assert.ok(denied, "exact retry after teardown must fail");
}
prepare(); await teardownFirst(); await sendFirst();
console.log("PASS two-session send/teardown orderings, post-commit read, exact retry");

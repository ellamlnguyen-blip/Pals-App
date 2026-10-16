// TASK-033D2. Named disposable migrated DB only. Uses new synthetic users.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const container = process.env.PALS_D2_DB;
if (container !== "supabase_db_pals-task029-disposable") {
  throw new Error("Set PALS_D2_DB=supabase_db_pals-task029-disposable");
}
const args = ["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
function sql(query) { return execFileSync("docker", args, { input: `${query}\n`, encoding: "utf8" }).trim(); }
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let out = "", err = "";
  child.stdout.on("data", (x) => out += x);
  child.stderr.on("data", (x) => err += x);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`),
    out: () => out, err: () => err,
    done: new Promise((resolve) => child.on("close", (code) => resolve(code))) };
}
async function until(check) {
  for (let i=0;i<240;i++) { if (check()) return; await new Promise((r)=>setTimeout(r,25)); }
  throw new Error("D2 concurrency barrier timed out");
}
async function waiting(name) {
  await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}'
    and wait_event_type='Lock'`) === "1");
}
function claims(id) { return `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`; }
function firstSend(actor,peer,key,body) {
  return `begin; ${claims(actor)} select generation_id||':'||message_id
    from public.send_friend_dm_message('${peer}','${key}','${body}');`;
}
const a=randomUUID(), b=randomUUID();
let setupStarted=false;
const allSessions=[];
function open(name) { const s=session(name); allSessions.push(s); return s; }
async function firstSendRace() {
  const gate=open("d2_first_gate"), x=open("d2_first_a"), y=open("d2_first_b");
  const keyA=randomUUID(), keyB=randomUUID();
  gate.send("begin; select private.social_hangout_mutation_lock(); select 'gate_held';");
  await until(()=>gate.out().includes("gate_held"));
  x.send(`${firstSend(a,b,keyA,"First A")} commit;`);
  y.send(`${firstSend(b,a,keyB,"First B")} commit;`);
  await waiting("d2_first_a"); await waiting("d2_first_b");
  gate.send("commit;");
  await until(()=>x.out().includes(":" ) && y.out().includes(":"));
  x.child.stdin.end(); y.child.stdin.end(); gate.child.stdin.end();
  assert.equal(await x.done,0,x.err()); assert.equal(await y.done,0,y.err()); await gate.done;
  const [genA,msgA]=x.out().split("\n").find((v)=>v.includes(":" )).split(":");
  const [genB,msgB]=y.out().split("\n").find((v)=>v.includes(":" )).split(":");
  assert.equal(genA,genB,"opposite first sends use one generation");
  assert.notEqual(msgA,msgB,"both first sends persisted");
  assert.equal(sql(`select count(*) from private.dm_pairs where low_id=least('${a}'::uuid,'${b}'::uuid)
    and high_id=greatest('${a}'::uuid,'${b}'::uuid) and state='accepted'`),"1");
  assert.equal(sql(`select count(*) from private.dm_messages where generation_id='${genA}'`),"2");
  const retry=sql(`${firstSend(a,b,keyA,"First A")} commit;`).split("\n").find((v)=>v.includes(":"));
  assert.equal(retry,`${genA}:${msgA}`,"exact first-send retry returns same message");
  return { generation:genA, keyA };
}
async function sendAfterUnfriend(generation,key) {
  const friendship=sql(`select generation_id from private.friendships where low_id=least('${a}'::uuid,'${b}'::uuid)
    and high_id=greatest('${a}'::uuid,'${b}'::uuid)`);
  const unf=open("d2_unfriend_first"), sender=open("d2_send_after_unfriend");
  unf.send(`begin; ${claims(b)} select public.unfriend('${a}','${friendship}'); select 'unfriend_held';`);
  await until(()=> { if (unf.err()) throw new Error(`unfriend failed: ${unf.err()}`); return unf.out().includes("unfriend_held"); });
  sender.send(`${firstSend(a,b,randomUUID(),"Must pause")} commit;`);
  await waiting("d2_send_after_unfriend");
  unf.send("commit;"); unf.child.stdin.end(); sender.child.stdin.end();
  assert.equal(await unf.done,0,unf.err()); assert.notEqual(await sender.done,0,"send after unfriend denied");
  assert.match(sender.err(),/DM unavailable/);
  assert.equal(sql(`begin; ${claims(a)} select count(*) from public.read_dm_messages('${b}','${generation}'); commit;`).split("\n")[0],"0");
  const retry=open("d2_retry_after_unfriend");
  retry.send(`${firstSend(a,b,key,"First A")} commit;`); retry.child.stdin.end();
  assert.notEqual(await retry.done,0,"old exact retry denied after unfriend");
  assert.match(retry.err(),/DM unavailable/);
}
async function consentThenUnfriend(generation,key) {
  // Re-establish friendship on the same active pair. The recipient's explicit
  // independent consent must survive a subsequent serialized unfriend.
  sql(`insert into private.friendships(low_id,high_id,requester_id,campus_id,state)
    values(least('${a}'::uuid,'${b}'::uuid),greatest('${a}'::uuid,'${b}'::uuid),'${a}',
     '00000000-0000-4000-8000-000000000001','accepted')`);
  const friendship=sql(`select generation_id from private.friendships where low_id=least('${a}'::uuid,'${b}'::uuid)
    and high_id=greatest('${a}'::uuid,'${b}'::uuid)`);
  // The pair initiator depends on which opposing send acquired the first lock.
  const initiator=sql(`select initiator_id from private.dm_pairs where generation_id='${generation}'`);
  const recipient=initiator===a?b:a;
  const consent=open("d2_consent_first"), unf=open("d2_unfriend_after_consent");
  consent.send(`begin; ${claims(recipient)} select public.accept_friend_dm_consent('${initiator}','${generation}'); select 'consent_held';`);
  await until(()=>consent.out().includes("consent_held"));
  unf.send(`begin; ${claims(b)} select public.unfriend('${a}','${friendship}'); commit;`);
  await waiting("d2_unfriend_after_consent");
  consent.send("commit;"); consent.child.stdin.end(); unf.child.stdin.end();
  assert.equal(await consent.done,0,consent.err()); assert.equal(await unf.done,0,unf.err());
  assert.equal(sql(`begin; ${claims(a)} select count(*) from public.read_dm_messages('${b}','${generation}'); commit;`).split("\n")[0],"2",
    "explicit independent consent survives unfriend");
  const retry=sql(`${firstSend(a,b,key,"First A")} commit;`).split("\n").find((v)=>v.includes(":"));
  assert.ok(retry?.startsWith(`${generation}:`),"exact retry reauthorized by independent consent");
}
async function blockThenRetry(generation,key) {
  const blocker=open("d2_block_first"), retry=open("d2_retry_after_block");
  blocker.send(`begin; ${claims(b)} select public.set_people_block('${a}',true); select 'block_held';`);
  await until(()=>blocker.out().includes("block_held"));
  retry.send(`${firstSend(a,b,key,"First A")} commit;`);
  await waiting("d2_retry_after_block");
  blocker.send("commit;"); blocker.child.stdin.end(); retry.child.stdin.end();
  assert.equal(await blocker.done,0,blocker.err());
  assert.notEqual(await retry.done,0,"blocked exact retry denied");
  assert.match(retry.err(),/DM unavailable/);
  assert.equal(sql(`select state from private.dm_pairs where generation_id='${generation}'`),"blocked");
}
try {
  assert.equal(sql(`select private.dm_enabled() and private.friendship_enabled() and
   private.people_enabled() and private.pilot_is_available() and private.safety_enabled()`),"t",
   "required disposable gates must already be enabled; harness never changes them");
  setupStarted=true;
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${a}','d2-race-${a}@unc.edu',now()),('${b}','d2-race-${b}@unc.edu',now());
    update public.profiles set real_name='D2 race',major='Biology',graduation_year=2028,
      bio='Disposable synthetic' where user_id in ('${a}','${b}');
    insert into private.people_preferences(account_id,opted_in) values ('${a}',true),('${b}',true);
    insert into private.friendships(low_id,high_id,requester_id,campus_id,state)
      values (least('${a}'::uuid,'${b}'::uuid),greatest('${a}'::uuid,'${b}'::uuid),
      '${a}', '00000000-0000-4000-8000-000000000001','accepted');`);
  const {generation,keyA}=await firstSendRace();
  await sendAfterUnfriend(generation,keyA);
  await consentThenUnfriend(generation,keyA);
  await blockThenRetry(generation,keyA);
  console.log("TASK-033D2 concurrency checks passed");
} finally {
  for (const s of allSessions) { if (s.child.exitCode===null) s.child.kill(); }
  if (setupStarted) {
    sql(`set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in ('${a}','${b}');
      delete from private.dm_messages where author_id in ('${a}','${b}');
      delete from private.dm_pairs where low_id=least('${a}'::uuid,'${b}'::uuid)
       and high_id=greatest('${a}'::uuid,'${b}'::uuid);
      delete from private.dm_suppression where initiator_id in ('${a}','${b}');
      delete from private.people_blocks where blocker_id in ('${a}','${b}');
      delete from auth.users where id in ('${a}','${b}');`);
  }
}

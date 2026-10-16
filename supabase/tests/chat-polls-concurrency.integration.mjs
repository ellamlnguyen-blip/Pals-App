// TASK-033C. Named disposable migrated DB only; no gate changes or reset.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
const container=process.env.PALS_D2_DB;
if(container!=="supabase_db_pals-task029-disposable") throw new Error("Use named disposable DB");
const args=["exec","-i",container,"psql","-X","-qAt","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1"];
const sql=(q)=>execFileSync("docker",args,{input:`${q}\n`,encoding:"utf8"}).trim();
const userA=randomUUID(),userB=randomUUID(), key=randomUUID();
const claims=(id)=>`set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
const sessions=[];
function session(name){
 const child=spawn("docker",args,{stdio:["pipe","pipe","pipe"]}); let out="",err="";
 child.stdout.on("data",x=>out+=x); child.stderr.on("data",x=>err+=x);
 child.stdin.write(`set application_name='${name}';\n`);
 const s={child,send:q=>child.stdin.write(`${q}\n`),out:()=>out,err:()=>err,
  done:new Promise(resolve=>child.on("close",resolve))}; sessions.push(s); return s;
}
async function until(f){for(let i=0;i<240;i++){if(f())return; await new Promise(r=>setTimeout(r,25));} throw Error("poll barrier timeout");}
async function waiting(name){await until(()=>sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`)==="1");}
let started=false, generation, poll, first, second;
try{
 assert.equal(sql(`select private.dm_enabled() and private.people_enabled() and private.friendship_enabled() and private.pilot_is_available()`),"t","source gates preenabled");
 started=true;
 sql(`insert into auth.users(id,email,email_confirmed_at) values ('${userA}','poll-race-${userA}@unc.edu',now()),('${userB}','poll-race-${userB}@unc.edu',now());
 update public.profiles set real_name='Poll race',major='Biology',graduation_year=2028,bio='Synthetic' where user_id in ('${userA}','${userB}');
 insert into private.people_preferences(account_id,opted_in) values ('${userA}',true),('${userB}',true);
 insert into private.friendships(low_id,high_id,requester_id,campus_id,state) values(least('${userA}'::uuid,'${userB}'::uuid),greatest('${userA}'::uuid,'${userB}'::uuid),'${userA}','00000000-0000-4000-8000-000000000001','accepted');`);
 generation=sql(`begin; ${claims(userA)} select generation_id from public.send_friend_dm_message('${userB}','${randomUUID()}','Poll race'); commit;`).split("\n").find(x=>/^[0-9a-f-]{36}$/.test(x));
 assert.ok(generation,"accepted generation created");
 poll=sql(`begin; ${claims(userA)} select public.create_chat_poll('dm','${generation}','${userB}','${key}','Where?',array['A','B']); commit;`).split("\n").find(x=>/^[0-9a-f-]{36}$/.test(x));
 assert.ok(poll,"poll created");
 [first,second]=sql(`select id from private.chat_poll_options where poll_id='${poll}' order by ordinal`).split("\n");
 // Two votes from the same actor serialize on source then poll. The second is current.
 const v1=session("c_poll_v1"),v2=session("c_poll_v2");
 v1.send(`begin; ${claims(userB)} select public.vote_chat_poll('dm','${generation}','${userA}','${poll}','${first}','${randomUUID()}'); select 'first_held';`);
 await until(()=>v1.out().includes("first_held"));
 v2.send(`begin; ${claims(userB)} select public.vote_chat_poll('dm','${generation}','${userA}','${poll}','${second}','${randomUUID()}'); commit;`);
 await waiting("c_poll_v2"); v1.send("commit;");
 for(const s of [v1,v2]) s.child.stdin.end();
 assert.equal(await v1.done,0,v1.err()); assert.equal(await v2.done,0,v2.err());
 assert.equal(sql(`select option_id from private.chat_poll_votes where poll_id='${poll}' and voter_id='${userB}'`),second,"serialized latest choice");
 // A close holding the source lock makes a concurrent vote fail after commit.
 const close=session("c_poll_close"),vote=session("c_poll_vote_after_close");
 close.send(`begin; ${claims(userA)} select public.close_chat_poll('dm','${generation}','${userB}','${poll}','${randomUUID()}'); select 'closed_held';`);
 await until(()=>close.out().includes("closed_held"));
 vote.send(`begin; ${claims(userB)} select public.vote_chat_poll('dm','${generation}','${userA}','${poll}','${first}','${randomUUID()}'); commit;`);
 await waiting("c_poll_vote_after_close"); close.send("commit;"); close.child.stdin.end(); vote.child.stdin.end();
 assert.equal(await close.done,0,close.err()); assert.notEqual(await vote.done,0,"vote after close denied");
 assert.match(vote.err(),/Poll closed/);
 assert.equal(sql(`select option_id from private.chat_poll_votes where poll_id='${poll}' and voter_id='${userB}'`),second,"close race retained current choice");
 // Unfriend commits before an exact create retry can reauthorize.
 const friendship=sql(`select generation_id from private.friendships where low_id=least('${userA}'::uuid,'${userB}'::uuid) and high_id=greatest('${userA}'::uuid,'${userB}'::uuid)`);
 const unf=session("c_poll_unfriend"),retry=session("c_poll_retry_after_unfriend");
 unf.send(`begin; ${claims(userA)} select public.unfriend('${userB}','${friendship}'); select 'unfriend_held';`);
 await until(()=>unf.out().includes("unfriend_held"));
 retry.send(`begin; ${claims(userA)} select public.create_chat_poll('dm','${generation}','${userB}','${key}','Where?',array['A','B']); commit;`);
 await waiting("c_poll_retry_after_unfriend"); unf.send("commit;"); unf.child.stdin.end(); retry.child.stdin.end();
 assert.equal(await unf.done,0,unf.err()); assert.notEqual(await retry.done,0,"revoked create retry denied"); assert.match(retry.err(),/Poll unavailable/);
 console.log("TASK-033C concurrency checks passed");
}finally{
 for(const s of sessions) if(s.child.exitCode===null)s.child.kill();
 if(started){
  sql(`set dm.allow_fixture_cleanup='true';
   delete from private.chat_poll_retries where actor_id in ('${userA}','${userB}');
   delete from private.chat_poll_votes where voter_id in ('${userA}','${userB}');
   delete from private.chat_poll_options where poll_id in (select id from private.chat_polls where creator_id in ('${userA}','${userB}'));
   delete from private.chat_polls where creator_id in ('${userA}','${userB}');
   delete from private.dm_retries where actor_id in ('${userA}','${userB}');
   delete from private.dm_messages where author_id in ('${userA}','${userB}');
   delete from private.dm_pairs where low_id=least('${userA}'::uuid,'${userB}'::uuid) and high_id=greatest('${userA}'::uuid,'${userB}'::uuid);
   delete from auth.users where id in ('${userA}','${userB}');`);
 }
}

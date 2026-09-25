import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

// Run serially against the disposable loopback Supabase database. The backend
// owner controls its lifetime; this fixture never starts, resets or stops it.
const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase",
  ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres",
  "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const u = {
  a: "51700000-0000-4000-8000-000000000001",
  b: "51700000-0000-4000-8000-000000000002",
  c: "51700000-0000-4000-8000-000000000003",
  d: "51700000-0000-4000-8000-000000000004",
  e: "51700000-0000-4000-8000-000000000005",
  f: "51700000-0000-4000-8000-000000000006",
  g: "51700000-0000-4000-8000-000000000007",
  h: "51700000-0000-4000-8000-000000000008",
  i: "51700000-0000-4000-8000-000000000009",
  j: "51700000-0000-4000-8000-000000000010",
};
const h = {
  join: "51700000-0000-4000-8001-000000000001",
  shared1: "51700000-0000-4000-8001-000000000002",
  shared2: "51700000-0000-4000-8001-000000000003",
  chat: "51700000-0000-4000-8001-000000000004",
  reverse: "51700000-0000-4000-8001-000000000005",
  leave: "51700000-0000-4000-8001-000000000006",
  remove: "51700000-0000-4000-8001-000000000007",
  edit: "51700000-0000-4000-8001-000000000008",
  joining: "51700000-0000-4000-8001-000000000009",
  cancel: "51700000-0000-4000-8001-000000000010",
  cancelAfter: "51700000-0000-4000-8001-000000000011",
  leaveAfter: "51700000-0000-4000-8001-000000000012",
  removeAfter: "51700000-0000-4000-8001-000000000013",
  history: "51700000-0000-4000-8001-000000000014",
};
const campus = "00000000-0000-4000-8000-000000000001";
const claims = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
const sql = (query) => execFileSync("docker", args, { input: query, encoding: "utf8" }).trim();
const call = (id, query) => sql(`begin; ${claims(id)} ${query} commit;`).split("\n")[0];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, failed) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    failed?.();
    await sleep(25);
  }
  failed?.();
  throw new Error("Observed database lock wait timed out");
}
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  let exitCode = null;
  child.stdout.on("data", (part) => output += part);
  child.stderr.on("data", (part) => output += part);
  child.on("exit", (code) => exitCode = code);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output,
    exitCode: () => exitCode, done: once(child, "exit") };
}
let sequence = 0;
async function race(label, leaderQuery, waiterQuery, waiterError = null, lockEvent = "advisory") {
  const tag = `global_${++sequence}_${label}`;
  const leader = session(`${tag}_leader`), waiter = session(`${tag}_waiter`);
  try {
    leader.send(`begin; ${leaderQuery} select 'global_leader_held';`);
    await until(() => leader.output().includes("global_leader_held"), () => {
      if (leader.exitCode() !== null || /ERROR:/.test(leader.output()))
        assert.fail(`${label}: leader failed before holding lock:\n${leader.output()}`);
    });
    waiter.send(`begin; ${waiterQuery} commit;`);
    await until(() => sql(`select count(*) from pg_stat_activity
      where application_name='${tag}_waiter' and wait_event_type='Lock'
        ${lockEvent ? `and wait_event='${lockEvent}'` : ""}`) === "1", () => {
      if (waiter.exitCode() !== null || /ERROR:/.test(waiter.output()))
        assert.fail(`${label}: waiter finished before observed lock wait:\n${waiter.output()}`);
    });
    leader.send("commit;"); leader.child.stdin.end(); waiter.child.stdin.end();
    const [leaderExit, waiterExit] = await Promise.all([leader.done, waiter.done]);
    assert.equal(leaderExit[0], 0, leader.output());
    if (waiterError) {
      assert.notEqual(waiterExit[0], 0, `expected waiter denial: ${waiter.output()}`);
      assert.match(waiter.output(), waiterError);
    } else {
      assert.equal(waiterExit[0], 0, waiter.output());
      assert.doesNotMatch(waiter.output(), /ERROR:/);
    }
  } finally { leader.child.kill(); waiter.child.kill(); }
}
const state = (hangout, id) => sql(`select state from public.hangout_participants
  where hangout_id='${hangout}' and account_id='${id}'`);
const blocked = (actor, peer) => sql(`select count(*) from private.people_blocks
  where blocker_id='${actor}' and blocked_id='${peer}'`);
const block = (actor, peer, value) => `${claims(actor)} select public.set_safety_block('${peer}',${value});`;
const join = (actor, hangout) => `${claims(actor)} select public.join_hangout('${hangout}');`;
const sendChat = (actor, hangout, id) => `${claims(actor)} select message_id from public.send_hangout_message('${hangout}','${id}','Race text');`;
const leave = (actor, hangout) => `${claims(actor)} select public.leave_hangout('${hangout}');`;
const remove = (actor, hangout, peer) => `${claims(actor)} select public.remove_hangout_participant('${hangout}','${peer}',(select revision from public.hangouts where id='${hangout}'));`;
const edit = (actor, hangout, revision, title) => `${claims(actor)} select public.edit_hangout('${hangout}',${revision},'${title}',
  (select starts_at from public.hangouts where id='${hangout}'),'Area',35,-79);`;
const joining = (actor, hangout, revision, value) => `${claims(actor)} select public.set_hangout_joining('${hangout}',${revision},'${value}');`;
const cancel = (actor, hangout, revision) => `${claims(actor)} select public.cancel_hangout('${hangout}',${revision});`;
const create = (actor, request) => `${claims(actor)} select public.create_hangout('${request}',
  'Race creation',now()+interval '1 day','Area',35,-79);`;
function addHangout(hangout, host, peer = null) {
  sql(`begin;
    insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
      values('${hangout}','${campus}','${host}','Race extra',now()+interval '1 day','Area',35,-79);
    insert into public.hangout_participants(hangout_id,account_id,state) values('${hangout}','${host}','joined')
      ${peer ? `,('${hangout}','${peer}','joined')` : ""};
    commit;`);
}

test("global block serializes joined Hangouts, social writes and message sends", { timeout: 180_000 }, async () => {
  const ids = Object.values(u).map((id) => `'${id}'`).join(",");
  const hangoutIds = Object.values(h).map((id) => `'${id}'`).join(",");
  sql(`begin;
    insert into auth.users(id,email,email_confirmed_at) values
    ${Object.entries(u).map(([key,id]) => `('${id}','global-race-${key}@unc.edu',now())`).join(",")};
    update public.university_memberships m set university_id='${campus}',
      verified_at=now(),verification_email=au.email
      from auth.users au where au.id=m.user_id and au.id in (${ids});
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in (${ids});
    update public.profiles set real_name='Global race',major='Science',graduation_year=2028,
      bio='Disposable fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in (${ids});
    insert into private.people_preferences(account_id,opted_in) select id,true from public.accounts where id in (${ids});
    insert into public.hangouts(id,university_id,host_id,title,starts_at,public_place,public_latitude,public_longitude)
      values ('${h.join}','${campus}','${u.a}','Join race',now()+interval '1 day','Area',35,-79),
        ('${h.shared1}','${campus}','${u.a}','Shared one',now()+interval '1 day','Area',35,-79),
        ('${h.shared2}','${campus}','${u.a}','Shared two',now()+interval '1 day','Area',35,-79),
        ('${h.chat}','${campus}','${u.d}','Chat race',now()+interval '1 day','Area',35,-79);
    insert into public.hangout_participants(hangout_id,account_id,state) values
      ('${h.join}','${u.a}','joined'),('${h.join}','${u.b}','joined'),
      ('${h.shared1}','${u.a}','joined'),('${h.shared1}','${u.b}','joined'),
      ('${h.shared2}','${u.a}','joined'),('${h.shared2}','${u.b}','joined'),
      ('${h.chat}','${u.d}','joined'),('${h.chat}','${u.b}','joined');
    update private.safety_feature_gate set enabled=true;
    update private.people_feature_gate set enabled=true;
    update private.friendship_feature_gate set enabled=true;
    update private.dm_feature_gate set enabled=true;
    update private.hangout_feature_gate set enabled=true;
    update private.hangout_chat_feature_gate set enabled=true;
    update private.notification_feature_gate set enabled=true;
    commit;`);
  try {
    // A join wins first: the later nonhost block finds the newly joined peer.
    await race("join_then_block",join(u.c,h.join),block(u.b,u.c,true));
    assert.equal(state(h.join,u.b),"left");
    assert.equal(blocked(u.b,u.c),"1");
    call(u.b,`select public.set_safety_block('${u.c}',false);`);
    call(u.b,`select public.join_hangout('${h.join}');`);
    call(u.c,`select public.leave_hangout('${h.join}');`);
    // A block wins first: the waiting join rechecks all joined members.
    await race("block_then_join",block(u.b,u.c,true),join(u.c,h.join),/Hangout operation not permitted/);
    assert.equal(state(h.join,u.c),"left");
    assert.equal(state(h.join,u.b),"joined");
    call(u.b,`select public.set_safety_block('${u.c}',false);`);

    // Host removal covers both retained shared Hangouts. The opposite block
    // waits, then succeeds from retained participation evidence.
    await race("host_then_opposite",block(u.a,u.b,true),block(u.b,u.a,true));
    assert.equal(state(h.shared1,u.b),"removed");
    assert.equal(state(h.shared2,u.b),"removed");
    assert.equal(state(h.shared1,u.a),"joined");
    assert.equal(state(h.shared2,u.a),"joined");
    assert.equal(blocked(u.a,u.b),"1"); assert.equal(blocked(u.b,u.a),"1");

    await race("chat_then_block",sendChat(u.b,h.chat,"51700000-0000-4000-8002-000000000001"),
      block(u.d,u.b,true));
    assert.equal(state(h.chat,u.b),"removed");
    assert.equal(sql(`select count(*) from private.hangout_messages where author_id='${u.b}'`),"1");
    call(u.d,`select public.set_safety_block('${u.b}',false);`);
    // The removed participant cannot send after a block or after unblock.
    await race("block_then_chat",block(u.d,u.b,true),
      sendChat(u.b,h.chat,"51700000-0000-4000-8002-000000000002"),/Hangout chat unavailable/);
    assert.equal(sql(`select count(*) from private.hangout_messages where author_id='${u.b}'`),"1");

    addHangout(h.reverse,u.d,u.c);
    await race("nonhost_then_opposite",block(u.c,u.d,true),block(u.d,u.c,true));
    assert.equal(state(h.reverse,u.c),"left");
    assert.equal(state(h.reverse,u.d),"joined");
    assert.equal(blocked(u.c,u.d),"1"); assert.equal(blocked(u.d,u.c),"1");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);
    call(u.d,`select public.set_safety_block('${u.c}',false);`);

    addHangout(h.leave,u.d,u.c);
    await race("leave_then_block",leave(u.c,h.leave),block(u.d,u.c,true));
    assert.equal(state(h.leave,u.c),"left");
    call(u.d,`select public.set_safety_block('${u.c}',false);`);
    addHangout(h.leaveAfter,u.d,u.c);
    await race("block_then_leave",block(u.d,u.c,true),leave(u.c,h.leaveAfter),
      /Hangout operation not permitted/);
    assert.equal(state(h.leaveAfter,u.c),"removed");
    call(u.d,`select public.set_safety_block('${u.c}',false);`);

    addHangout(h.remove,u.d,u.c);
    await race("remove_then_block",remove(u.d,h.remove,u.c),block(u.c,u.d,true));
    assert.equal(state(h.remove,u.c),"removed");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);
    addHangout(h.removeAfter,u.d,u.c);
    await race("block_then_remove",block(u.c,u.d,true),remove(u.d,h.removeAfter,u.c));
    assert.equal(state(h.removeAfter,u.c),"removed", "host removal may follow a safety departure");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);

    addHangout(h.edit,u.d,u.c);
    await race("edit_then_block",edit(u.d,h.edit,1,"Edited first"),block(u.c,u.d,true));
    assert.equal(state(h.edit,u.c),"left");
    assert.equal(sql(`select revision from public.hangouts where id='${h.edit}'`),"2");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);
    call(u.c,`select public.join_hangout('${h.edit}');`);
    await race("block_then_edit",block(u.c,u.d,true),edit(u.d,h.edit,2,"Edited second"));
    assert.equal(state(h.edit,u.c),"left");
    assert.equal(sql(`select revision from public.hangouts where id='${h.edit}'`),"3");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);

    addHangout(h.joining,u.d,u.c);
    await race("joining_then_block",joining(u.d,h.joining,1,"closed"),block(u.c,u.d,true));
    assert.equal(state(h.joining,u.c),"left");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);
    call(u.d,`select public.set_hangout_joining('${h.joining}',2,'open');`);
    call(u.c,`select public.join_hangout('${h.joining}');`);
    await race("block_then_joining",block(u.c,u.d,true),joining(u.d,h.joining,3,"closed"));
    assert.equal(state(h.joining,u.c),"left");
    assert.equal(sql(`select joining_state from public.hangouts where id='${h.joining}'`),"closed");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);

    addHangout(h.cancel,u.d,u.c);
    await race("cancel_then_block",cancel(u.d,h.cancel,1),block(u.c,u.d,true));
    assert.equal(state(h.cancel,u.c),"left", "cancelled retained roster still separates");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);
    addHangout(h.cancelAfter,u.d,u.c);
    await race("block_then_cancel",block(u.c,u.d,true),cancel(u.d,h.cancelAfter,1));
    assert.equal(state(h.cancelAfter,u.c),"left");
    assert.equal(sql(`select status from public.hangouts where id='${h.cancelAfter}'`),"cancelled");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);

    // Creation has no shared roster yet, but still participates in the same
    // global order and retains the new host after either commit order.
    await race("create_then_block",create(u.d,"51700000-0000-4000-8003-000000000021"),
      block(u.c,u.d,true));
    call(u.c,`select public.set_safety_block('${u.d}',false);`);
    await race("block_then_create",block(u.c,u.d,true),
      create(u.d,"51700000-0000-4000-8003-000000000022"));
    assert.equal(sql(`select count(*) from public.hangouts where host_id='${u.d}' and title='Race creation'`),"2");
    call(u.c,`select public.set_safety_block('${u.d}',false);`);

    await race("friend_then_block",`${claims(u.e)} select public.create_friend_request('${u.f}',
      '51700000-0000-4000-8003-000000000001');`,block(u.f,u.e,true));
    assert.equal(sql(`select count(*) from private.friendships where low_id='${u.e}' and high_id='${u.f}'`),"0");
    call(u.f,`select public.set_safety_block('${u.e}',false);`);
    await race("block_then_friend",block(u.f,u.e,true),`${claims(u.e)} select public.create_friend_request('${u.f}',
      '51700000-0000-4000-8003-000000000002');`,/Friendship unavailable/);
    assert.equal(sql(`select count(*) from private.friendships where low_id='${u.e}' and high_id='${u.f}'`),"0");
    call(u.f,`select public.set_safety_block('${u.e}',false);`);

    const acceptedFriend = call(u.e,`select public.create_friend_request('${u.f}',
      '51700000-0000-4000-8003-000000000011');`);
    assert.match(acceptedFriend,/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    assert.equal(sql(`select state||':'||requester_id from private.friendships
      where generation_id='${acceptedFriend}'`),`pending:${u.e}`);
    await race("friend_accept_then_block",`${claims(u.f)} select public.accept_friend_request('${u.e}',
      '${acceptedFriend}');`,block(u.e,u.f,true));
    assert.equal(sql(`select count(*) from private.friendships where low_id='${u.e}' and high_id='${u.f}'`),"0");
    call(u.e,`select public.set_safety_block('${u.f}',false);`);
    const deniedFriend = call(u.e,`select public.create_friend_request('${u.f}',
      '51700000-0000-4000-8003-000000000012');`);
    await race("block_then_friend_accept",block(u.e,u.f,true),
      `${claims(u.f)} select public.accept_friend_request('${u.e}','${deniedFriend}');`,
      /Friendship unavailable/);
    assert.equal(sql(`select count(*) from private.friendships where low_id='${u.e}' and high_id='${u.f}'`),"0");
    call(u.e,`select public.set_safety_block('${u.f}',false);`);

    await race("dm_create_then_block",`${claims(u.e)} select public.create_dm_request('${u.f}',
      '51700000-0000-4000-8003-000000000013','Race create');`,block(u.f,u.e,true));
    assert.equal(sql(`select count(*) from private.dm_pairs where low_id='${u.e}' and high_id='${u.f}'
      and state in ('pending','accepted')`),"0");
    call(u.f,`select public.set_safety_block('${u.e}',false);`);
    await race("block_then_dm_create",block(u.f,u.e,true),`${claims(u.e)} select public.create_dm_request('${u.f}',
      '51700000-0000-4000-8003-000000000014','Denied create');`,/DM unavailable/);
    call(u.f,`select public.set_safety_block('${u.e}',false);`);

    const acceptedDm = call(u.e,`select public.create_dm_request('${u.f}',
      '51700000-0000-4000-8003-000000000015','Accept race');`);
    await race("dm_accept_then_block",`${claims(u.f)} select public.transition_dm('${u.e}',
      '${acceptedDm}','accept');`,block(u.e,u.f,true));
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${acceptedDm}'`),"blocked");
    call(u.e,`select public.set_safety_block('${u.f}',false);`);
    const deniedDm = call(u.e,`select public.create_dm_request('${u.f}',
      '51700000-0000-4000-8003-000000000016','Denied accept');`);
    await race("block_then_dm_accept",block(u.e,u.f,true),
      `${claims(u.f)} select public.transition_dm('${u.e}','${deniedDm}','accept');`,/DM unavailable/);
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${deniedDm}'`),"blocked");
    call(u.e,`select public.set_safety_block('${u.f}',false);`);

    const generation = call(u.e,`select public.create_dm_request('${u.f}',
      '51700000-0000-4000-8003-000000000003','Initial');`);
    call(u.f,`select public.transition_dm('${u.e}','${generation}','accept');`);
    await race("dm_send_then_block",`${claims(u.e)} select public.send_dm_message('${u.f}','${generation}',
      '51700000-0000-4000-8003-000000000004','Before block');`,block(u.f,u.e,true));
    assert.equal(sql(`select state from private.dm_pairs where generation_id='${generation}'`),"blocked");
    assert.equal(sql(`select count(*) from private.dm_messages where generation_id='${generation}'`),"2");
    await race("block_then_dm_send",block(u.f,u.e,true),`${claims(u.e)} select public.send_dm_message('${u.f}',
      '${generation}','51700000-0000-4000-8003-000000000005','After block');`,/DM unavailable/);
    assert.equal(sql(`select count(*) from private.dm_messages where generation_id='${generation}'`),"2");

    // Privileged gate updates do not acquire the shared advisory lock. The
    // block waits on the gate row, then rechecks the committed off state.
    await race("safety_gate_then_block", "update private.safety_feature_gate set enabled=false;",
      block(u.b,u.c,true), /Safety operation unavailable/, null);
    assert.equal(blocked(u.b,u.c),"0");
    sql("update private.safety_feature_gate set enabled=true");
    await race("block_then_safety_gate", block(u.b,u.c,true),
      "update private.safety_feature_gate set enabled=false;", null, null);
    assert.equal(blocked(u.b,u.c),"1");
    sql("update private.safety_feature_gate set enabled=true");
    call(u.b,`select public.set_safety_block('${u.c}',false);`);

    // Readiness changes also use their existing row locks. A waiting join
    // must reevaluate completeness after the profile update commits.
    await race("photo_then_join", `update public.profiles set primary_photo_path=null where user_id='${u.c}';`,
      join(u.c,h.join), /Hangout operation not permitted/, null);
    assert.equal(state(h.join,u.c),"left");
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='${u.c}'`);

    call(u.c,`select public.join_hangout('${h.join}');`);
    call(u.c,"select public.set_notification_preference('messages',true);");
    const beforeNotice = Number(sql(`select count(*) from private.notification_items
      where recipient_id='${u.c}' and target_id='${h.join}' and event_code='hangout_chat_message'`));
    await race("preference_then_chat", `${claims(u.c)} select public.set_notification_preference('messages',false);`,
      sendChat(u.a,h.join,"51700000-0000-4000-8002-000000000003"), null, null);
    assert.equal(Number(sql(`select count(*) from private.notification_items
      where recipient_id='${u.c}' and target_id='${h.join}' and event_code='hangout_chat_message'`)),
      beforeNotice, "committed message mute suppresses the waiting chat event");

    call(u.c,"select public.set_notification_preference('messages',true);");
    await race("chat_then_preference",sendChat(u.a,h.join,"51700000-0000-4000-8002-000000000004"),
      `${claims(u.c)} select public.set_notification_preference('messages',false);`,null,null);
    assert.equal(Number(sql(`select count(*) from private.notification_items
      where recipient_id='${u.c}' and target_id='${h.join}' and event_code='hangout_chat_message'`)),
      beforeNotice+1, "chat holding recipient lock emits before subsequent mute");

    await race("chat_gate_then_send", "update private.hangout_chat_feature_gate set enabled=false;",
      sendChat(u.a,h.join,"51700000-0000-4000-8002-000000000005"),/Hangout chat unavailable/,null);
    sql("update private.hangout_chat_feature_gate set enabled=true");
    await race("send_then_chat_gate",sendChat(u.a,h.join,"51700000-0000-4000-8002-000000000006"),
      "update private.hangout_chat_feature_gate set enabled=false;",null,null);
    assert.equal(sql(`select count(*) from private.hangout_messages m
      join private.hangout_conversations c on c.id=m.conversation_id
      where c.hangout_id='${h.join}' and m.author_id='${u.a}'`),"3",
      "source-off-first send was denied, while source-off-second send committed");
    sql("update private.hangout_chat_feature_gate set enabled=true");

    addHangout(h.history,u.g,u.h);
    call(u.h,`select public.leave_hangout('${h.history}');`);
    assert.equal(sql(`select private.safety_peer_evidence('${u.h}','${u.g}')`),"t",
      "departed participant retains host relationship evidence");
    await race("suspend_then_historical_block",
      `update public.accounts set status='suspended' where id='${u.h}';`,
      block(u.h,u.g,true),/Safety operation unavailable/,null);
    assert.equal(blocked(u.h,u.g),"0");
    sql(`update public.accounts set status='active' where id='${u.h}'`);
    await race("historical_block_then_suspend",block(u.h,u.g,true),
      `update public.accounts set status='suspended' where id='${u.h}';`,null,null);
    assert.equal(blocked(u.h,u.g),"1");
    sql(`update public.accounts set status='active' where id='${u.h}'`);
    call(u.h,`select public.set_safety_block('${u.g}',false);`);

    assert.equal(sql(`select private.safety_peer_evidence('${u.i}','${u.j}')`),"f",
      "live-visibility race pair has no historical relation");
    await race("people_gate_then_new_block", "update private.people_feature_gate set enabled=false;",
      block(u.i,u.j,true),/Safety operation unavailable/,null);
    assert.equal(blocked(u.i,u.j),"0");
    sql("update private.people_feature_gate set enabled=true");
    await race("new_block_then_people_gate",block(u.i,u.j,true),
      "update private.people_feature_gate set enabled=false;",null,null);
    assert.equal(blocked(u.i,u.j),"1");
    sql("update private.people_feature_gate set enabled=true");
    call(u.i,`select public.set_safety_block('${u.j}',false);`);

    await race("optout_then_new_block",
      `update private.people_preferences set opted_in=false where account_id='${u.j}';`,
      block(u.i,u.j,true),/Safety operation unavailable/,null);
    assert.equal(blocked(u.i,u.j),"0");
    sql(`update private.people_preferences set opted_in=true where account_id='${u.j}'`);
    await race("new_block_then_optout",block(u.i,u.j,true),
      `update private.people_preferences set opted_in=false where account_id='${u.j}';`,null,null);
    assert.equal(blocked(u.i,u.j),"1");
    sql(`update private.people_preferences set opted_in=true where account_id='${u.j}'`);
    call(u.i,`select public.set_safety_block('${u.j}',false);`);

    await race("photo_then_new_block",
      `update public.profiles set primary_photo_path=null where user_id='${u.j}';`,
      block(u.i,u.j,true),/Safety operation unavailable/,null);
    assert.equal(blocked(u.i,u.j),"0");
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='${u.j}'`);
    await race("new_block_then_photo",block(u.i,u.j,true),
      `update public.profiles set primary_photo_path=null where user_id='${u.j}';`,null,null);
    assert.equal(blocked(u.i,u.j),"1");
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='${u.j}'`);
    call(u.i,`select public.set_safety_block('${u.j}',false);`);

    const beforeRollback = blocked(u.e,u.f);
    sql(`begin; ${claims(u.e)} select public.set_safety_block('${u.f}',true); rollback;`);
    assert.equal(blocked(u.e,u.f),beforeRollback,"rolled-back block leaves no relation");
    for (const isolation of ["repeatable read","serializable"]) {
      assert.throws(() => sql(`begin isolation level ${isolation}; ${claims(u.e)}
        select public.set_safety_block('${u.f}',true); rollback;`),/Safety operation unavailable/);
      assert.equal(blocked(u.e,u.f),beforeRollback,`${isolation} must not write a block`);
    }
  } finally {
    sql(`update private.notification_feature_gate set enabled=false;
      update private.hangout_chat_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      update private.dm_feature_gate set enabled=false;
      update private.friendship_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      update private.safety_feature_gate set enabled=false;
      delete from private.notification_items where recipient_id in (${ids}) or actor_id in (${ids});
      delete from private.notification_preferences where recipient_id in (${ids});
      set chat.allow_fixture_cleanup='true';
      delete from private.hangout_message_requests where hangout_id in (${hangoutIds});
      delete from private.hangout_messages where conversation_id in
        (select id from private.hangout_conversations where hangout_id in (${hangoutIds}));
      delete from private.hangout_conversations where hangout_id in (${hangoutIds});
      delete from private.hangout_create_requests where hangout_id in (${hangoutIds});
      delete from private.hangout_create_requests where host_id in (${ids});
      delete from public.hangouts where id in (${hangoutIds});
      delete from public.hangouts where host_id in (${ids}) and title='Race creation';
      set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in (${ids});
      delete from private.dm_messages where author_id in (${ids});
      delete from private.dm_pairs where low_id in (${ids}) or high_id in (${ids});
      delete from private.dm_suppression where initiator_id in (${ids}) or recipient_id in (${ids});
      delete from private.friendship_create_requests where actor_id in (${ids}) or target_id in (${ids});
      delete from private.friendships where low_id in (${ids}) or high_id in (${ids});
      delete from private.friendship_suppression where requester_id in (${ids}) or recipient_id in (${ids});
      delete from private.people_blocks where blocker_id in (${ids}) or blocked_id in (${ids});
      delete from private.people_preferences where account_id in (${ids});
      update public.profiles set primary_photo_path=null where user_id in (${ids});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${ids});
      delete from auth.users where id in (${ids});`);
  }
});

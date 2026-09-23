import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const a = "14000000-0000-4000-8000-000000000001", b = "14000000-0000-4000-8000-000000000002";
const claims = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
function sql(query) { return execFileSync("docker", args, { input: query, encoding: "utf8" }).trim(); }
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => output += chunk);
  child.stderr.on("data", (chunk) => output += chunk);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output, done: once(child, "exit") };
}
async function until(check) {
  for (let i = 0; i < 200; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Friendship race barrier timed out");
}
async function waiting(name) {
  await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`) === "1");
}

test("block wins against waiting accept and tears down while friendship gate is off", async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${a}','friend-race-a@unc.edu',now()),('${b}','friend-race-b@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${a}','${b}');
    update public.profiles set real_name='Friend race',major='Science',graduation_year=2028,
      bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${a}','${b}');
    insert into private.people_preferences(account_id,opted_in) values ('${a}',true),('${b}',true);
    update private.people_feature_gate set enabled=true;
    update private.friendship_feature_gate set enabled=true;`);
  try {
    const generation = sql(`begin; ${claims(a)} select public.create_friend_request('${b}','14000000-0000-4000-8000-000000000099'); commit;`).split("\n").at(-1);
    const blocker = session("task012a_blocker"), waiter = session("task012a_accept_waiter");
    try {
      blocker.send(`begin; ${claims(a)} select public.set_people_block('${b}',true); select 'blocked';`);
      await until(() => blocker.output().includes("blocked"));
      waiter.send(`begin; ${claims(b)} select public.accept_friend_request('${a}','${generation}'); commit;`);
      await waiting("task012a_accept_waiter");
      blocker.send("commit;"); blocker.child.stdin.end(); waiter.child.stdin.end();
      await blocker.done; await waiter.done;
      assert.match(waiter.output(), /Friendship unavailable/);
      assert.equal(sql(`select count(*) from private.friendships where low_id='${a}' and high_id='${b}'`), "0");
    } finally { blocker.child.kill(); waiter.child.kill(); }

    sql(`delete from private.people_blocks;`);
    const next = sql(`begin; ${claims(a)} select public.create_friend_request('${b}','14000000-0000-4000-8000-000000000098'); commit;`).split("\n").at(-1);
    const holder = session("task012a_gate_holder"), blocked = session("task012a_gate_waiter");
    try {
      holder.send(`begin; select pg_advisory_xact_lock(hashtextextended(least('${a}','${b}')||':'||greatest('${a}','${b}'),0)); select 'held';`);
      await until(() => holder.output().includes("held"));
      blocked.send(`begin; ${claims(b)} select public.accept_friend_request('${a}','${next}'); commit;`);
      await waiting("task012a_gate_waiter");
      sql("update private.friendship_feature_gate set enabled=false");
      holder.send("commit;"); holder.child.stdin.end(); blocked.child.stdin.end();
      await holder.done; await blocked.done;
      assert.match(blocked.output(), /Friendship unavailable/, "gate revocation after lock denies accept");
      assert.equal(sql(`select state from private.friendships where low_id='${a}' and high_id='${b}'`), "pending");
    } finally { holder.child.kill(); blocked.child.kill(); }
    sql(`begin; ${claims(a)} select public.set_people_block('${b}',true); commit;`);
    sql("update private.friendship_feature_gate set enabled=true");
    assert.equal(sql(`select count(*) from private.friendships where low_id='${a}' and high_id='${b}'`), "0");
    for (const isolation of ["repeatable read", "serializable"])
      assert.throws(() => sql(`begin isolation level ${isolation}; ${claims(a)} select * from public.list_friendships(); rollback;`), /People operation unavailable/);
  } finally {
    sql(`update private.friendship_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      delete from private.friendships where low_id in ('${a}','${b}') or high_id in ('${a}','${b}');
      delete from private.friendship_create_requests where actor_id in ('${a}','${b}');
      delete from private.friendship_suppression where requester_id in ('${a}','${b}') or recipient_id in ('${a}','${b}');
      delete from private.people_blocks where blocker_id in ('${a}','${b}') or blocked_id in ('${a}','${b}');
      delete from private.people_preferences where account_id in ('${a}','${b}');
      delete from auth.users where id in ('${a}','${b}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${a}','${b}');`);
  }
});

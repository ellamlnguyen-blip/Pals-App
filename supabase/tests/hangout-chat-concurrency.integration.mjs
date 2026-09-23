import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321", "disposable loopback Supabase required");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const actor = "51310000-0000-4000-8000-000000000001";
const peer = "51310000-0000-4000-8000-000000000002";
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
  for (let i = 0; i < 240; i++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Chat race barrier timed out");
}
async function waiting(name) {
  await until(() => sql(`select count(*) from pg_stat_activity where application_name='${name}' and wait_event_type='Lock'`) === "1");
}

test("Hangout chat send serializes against committed revocation and holds readiness through commit", async () => {
  let hangout;
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${actor}','chat-race-1@unc.edu',now()),('${peer}','chat-race-2@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${actor}','${peer}');
    update public.profiles set real_name='Chat race',major='Science',graduation_year=2028,
      bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${actor}','${peer}');
    update private.hangout_feature_gate set enabled=true;
    update private.hangout_chat_feature_gate set enabled=true;`);
  try {
    hangout = sql(`begin; ${claims(actor)} select public.create_hangout(
      '51310000-0000-4000-8000-000000000099','Chat race',now()+interval '1 hour','Area',35,-79); commit;`).split("\n").at(-1);
    sql(`begin; ${claims(peer)} select public.join_hangout('${hangout}'); commit;`);
    const send = (key) => `begin; ${claims(peer)} select sequence from public.send_hangout_message('${hangout}','51310000-0000-4000-8001-${String(key).padStart(12, "0")}','Race'); commit;`;

    // A committed gate revocation before the send obtains its evidence lock wins.
    {
      const holder = session("chat_gate_holder"), waiter = session("chat_gate_waiter");
      try {
        holder.send("begin; update private.hangout_chat_feature_gate set enabled=false; select 'revoked';");
        await until(() => holder.output().includes("revoked"));
        waiter.send(send(1));
        await waiting("chat_gate_waiter");
        holder.send("commit;"); holder.child.stdin.end(); waiter.child.stdin.end();
        await holder.done; await waiter.done;
        assert.match(waiter.output(), /Hangout chat unavailable/);
        assert.equal(sql("select count(*) from private.hangout_messages"), "0");
      } finally { holder.child.kill(); waiter.child.kill(); }
    }
    sql("update private.hangout_chat_feature_gate set enabled=true");

    // A writer begun after send's locks cannot commit before that send.
    {
      const sender = session("chat_send_holds_gate"), writer = session("chat_gate_writer");
      try {
        sender.send(`begin; ${claims(peer)} select sequence from public.send_hangout_message('${hangout}','51310000-0000-4000-8001-000000000002','Race'); select 'sent';`);
        await until(() => sender.output().includes("sent"));
        writer.send("begin; update private.hangout_chat_feature_gate set enabled=false; commit;");
        await waiting("chat_gate_writer");
        assert.equal(sql("select enabled from private.hangout_chat_feature_gate"), "t");
        sender.send("commit;"); sender.child.stdin.end(); writer.child.stdin.end();
        await sender.done; await writer.done;
        assert.equal(sql("select count(*) from private.hangout_messages"), "1");
        assert.equal(sql("select enabled from private.hangout_chat_feature_gate"), "f");
      } finally { sender.child.kill(); writer.child.kill(); }
    }
    sql("update private.hangout_chat_feature_gate set enabled=true");

    // Profile revocation committed before send's FOR SHARE lock denies it.
    {
      const holder = session("chat_profile_holder"), waiter = session("chat_profile_waiter");
      try {
        holder.send(`begin; update public.profiles set primary_photo_path=null where user_id='${peer}'; select 'revoked';`);
        await until(() => holder.output().includes("revoked"));
        waiter.send(send(3));
        await waiting("chat_profile_waiter");
        holder.send("commit;"); holder.child.stdin.end(); waiter.child.stdin.end();
        await holder.done; await waiter.done;
        assert.match(waiter.output(), /Hangout chat unavailable|Hangout operation not permitted/);
        assert.equal(sql("select count(*) from private.hangout_messages"), "1");
      } finally { holder.child.kill(); waiter.child.kill(); }
    }
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='${peer}'`);

    for (const [name, revoke, restore, keyId] of [
      ["account", `update public.accounts set status='suspended' where id='${peer}'`, `update public.accounts set status='active' where id='${peer}'`, 7],
      ["email", `update auth.users set email='changed@example.invalid' where id='${peer}'`, `update auth.users set email='chat-race-2@unc.edu' where id='${peer}'`, 8],
      ["campus", `update public.university_memberships set university_id='51310000-0000-4000-8000-000000000099' where user_id='${peer}'`, `update public.university_memberships set university_id='00000000-0000-4000-8000-000000000001' where user_id='${peer}'`, 9],
      ["hangout_gate", "update private.hangout_feature_gate set enabled=false", "update private.hangout_feature_gate set enabled=true", 10],
    ]) {
      if (name === "campus") sql("insert into public.universities(id,slug,name,active,allowed_email_domains) values ('51310000-0000-4000-8000-000000000099','chat-race-other','Other campus',true,array['unc.edu'])");
      const holder = session(`chat_${name}_holder`), waiter = session(`chat_${name}_waiter`);
      try {
        holder.send(`begin; ${revoke}; select 'revoked';`);
        await until(() => holder.output().includes("revoked"));
        waiter.send(send(keyId));
        await waiting(`chat_${name}_waiter`);
        holder.send("commit;"); holder.child.stdin.end(); waiter.child.stdin.end();
        await holder.done; await waiter.done;
        assert.match(waiter.output(), /Hangout chat unavailable|Hangout operation not permitted/, `${name} revocation wins`);
        assert.equal(sql("select count(*) from private.hangout_messages"), "1");
      } finally { holder.child.kill(); waiter.child.kill(); }
      sql(restore);
    }

    // A profile/photo detachment begun after a completed send statement waits
    // for the transaction-held profile and object evidence locks.
    {
      const sender = session("chat_send_holds_photo"), writer = session("chat_photo_writer");
      try {
        sender.send(`begin; ${claims(peer)} select sequence from public.send_hangout_message('${hangout}','51310000-0000-4000-8001-000000000011','Race'); select 'sent';`);
        await until(() => sender.output().includes("sent"));
        writer.send(`begin; update public.profiles set primary_photo_path=null where user_id='${peer}'; commit;`);
        await waiting("chat_photo_writer");
        sender.send("commit;"); sender.child.stdin.end(); writer.child.stdin.end();
        await sender.done; await writer.done;
        assert.equal(sql("select count(*) from private.hangout_messages"), "2");
        assert.equal(sql(`select primary_photo_path is null from public.profiles where user_id='${peer}'`), "t");
      } finally { sender.child.kill(); writer.child.kill(); }
    }
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='${peer}'`);

    // A leave committed first wins the shared Hangout parent-row lock.
    {
      const leaver = session("chat_leave_holder"), waiter = session("chat_leave_waiter");
      try {
        leaver.send(`begin; ${claims(peer)} select public.leave_hangout('${hangout}'); select 'left';`);
        await until(() => leaver.output().includes("left"));
        waiter.send(send(4));
        await waiting("chat_leave_waiter");
        leaver.send("commit;"); leaver.child.stdin.end(); waiter.child.stdin.end();
        await leaver.done; await waiter.done;
        assert.match(waiter.output(), /Hangout chat unavailable|Hangout operation not permitted/);
      } finally { leaver.child.kill(); waiter.child.kill(); }
    }
    sql(`begin; ${claims(peer)} select public.join_hangout('${hangout}'); commit;`);

    // Same-key overlapping sends serialize into one immutable row.
    {
      const first = session("chat_duplicate_first"), second = session("chat_duplicate_second");
      try {
        first.send(`begin; ${claims(peer)} select message_id from public.send_hangout_message('${hangout}','51310000-0000-4000-8001-000000000005','Race'); select 'first';`);
        await until(() => first.output().includes("first"));
        second.send(send(5));
        await waiting("chat_duplicate_second");
        first.send("commit;"); first.child.stdin.end(); second.child.stdin.end();
        await first.done; await second.done;
        assert.equal(sql("select count(*) from private.hangout_messages"), "3");
      } finally { first.child.kill(); second.child.kill(); }
    }

    sql(`insert into storage.objects(bucket_id,name,owner_id) values
      ('profile-photos','${peer}/replacement.png','${peer}')`);
    {
      const sender = session("chat_send_holds_photo_replace"), writer = session("chat_photo_replace_writer");
      try {
        sender.send(`begin; ${claims(peer)} select sequence from public.send_hangout_message('${hangout}','51310000-0000-4000-8001-000000000012','Race'); select 'sent';`);
        await until(() => sender.output().includes("sent"));
        writer.send(`begin; update public.profiles set primary_photo_path='${peer}/replacement.png' where user_id='${peer}'; commit;`);
        await waiting("chat_photo_replace_writer");
        sender.send("commit;"); sender.child.stdin.end(); writer.child.stdin.end();
        await sender.done; await writer.done;
        assert.equal(sql("select count(*) from private.hangout_messages"), "4");
        assert.equal(sql(`select primary_photo_path from public.profiles where user_id='${peer}'`), `${peer}/replacement.png`);
      } finally { sender.child.kill(); writer.child.kill(); }
    }
    {
      const sender = session("chat_send_holds_photo_delete"), deleter = session("chat_photo_delete_writer");
      try {
        sender.send(`begin; ${claims(peer)} select sequence from public.send_hangout_message('${hangout}','51310000-0000-4000-8001-000000000013','Race'); select 'sent';`);
        await until(() => sender.output().includes("sent"));
        deleter.send(`begin; set storage.allow_delete_query='true'; delete from storage.objects where bucket_id='profile-photos' and name='${peer}/replacement.png'; commit;`);
        await waiting("chat_photo_delete_writer");
        sender.send("commit;"); sender.child.stdin.end(); deleter.child.stdin.end();
        await sender.done; await deleter.done;
        assert.match(deleter.output(), /Detach a profile photo before deleting it/);
        assert.equal(sql("select count(*) from private.hangout_messages"), "5");
        assert.equal(sql(`select count(*) from storage.objects where bucket_id='profile-photos' and name='${peer}/replacement.png'`), "1");
      } finally { sender.child.kill(); deleter.child.kill(); }
    }

    // Projection is already authorized before this controlled in-statement
    // delay. A gate disable during that delay cannot recall the page, while
    // the next authorization statement must deny.
    {
      const reader = session("chat_inflight_reader");
      try {
        reader.send(`begin; ${claims(peer)} select message_id, pg_sleep(2) from public.read_hangout_messages('${hangout}') limit 1; select 'read_finished'; commit;`);
        await until(() => sql("select count(*) from pg_stat_activity where application_name='chat_inflight_reader' and wait_event='PgSleep'") === "1");
        sql("update private.hangout_chat_feature_gate set enabled=false");
        reader.child.stdin.end(); await reader.done;
        assert.match(reader.output(), /read_finished/);
        assert.match(reader.output(), /[0-9a-f-]{36}/);
        assert.throws(() => sql(`begin; ${claims(peer)} select * from public.read_hangout_messages('${hangout}'); rollback;`), /Hangout chat unavailable/);
      } finally { reader.child.kill(); }
    }
    sql("update private.hangout_chat_feature_gate set enabled=true");
    for (const isolation of ["repeatable read", "serializable"]) {
      assert.throws(() => sql(`begin isolation level ${isolation}; ${claims(peer)} select * from public.read_hangout_messages('${hangout}'); rollback;`), /Hangout chat unavailable/);
      assert.throws(() => sql(`begin isolation level ${isolation}; ${claims(peer)} select * from public.send_hangout_message('${hangout}','51310000-0000-4000-8001-000000000006','Race'); rollback;`), /Hangout chat unavailable|Safety operation unavailable/);
    }
  } finally {
    sql(`update private.hangout_chat_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      set chat.allow_fixture_cleanup='true';
      delete from private.hangout_message_requests where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}';
      delete from private.hangout_messages where conversation_id in
        (select id from private.hangout_conversations where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}');
      delete from private.hangout_conversations where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}';
      delete from private.hangout_create_requests where hangout_id='${hangout ?? "00000000-0000-0000-0000-000000000000"}';
      delete from public.hangouts where id='${hangout ?? "00000000-0000-0000-0000-000000000000"}';
      update public.profiles set primary_photo_path=null where user_id in ('${actor}','${peer}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${actor}','${peer}');
      delete from auth.users where id in ('${actor}','${peer}');
      delete from public.universities where id='51310000-0000-4000-8000-000000000099';`);
  }
});

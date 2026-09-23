import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const args = ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres",
  "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
const a = "16000000-0000-4000-8000-000000000001";
const b = "16000000-0000-4000-8000-000000000002";
const otherCampus = "16000000-0000-4000-8000-0000000000ff";
const claims = (id) => `set local role authenticated; set local request.jwt.claims='{"sub":"${id}","role":"authenticated"}';`;
function sql(query) { return execFileSync("docker", args, { input: query, encoding: "utf8" }).trim(); }
function session(name) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => output += chunk);
  child.stderr.on("data", (chunk) => output += chunk);
  child.stdin.write(`set application_name='${name}';\n`);
  return { child, send: (query) => child.stdin.write(`${query}\n`), output: () => output, done: once(child,"exit") };
}
async function until(check) {
  for (let i=0;i<240;i++) { if (check()) return; await new Promise((r)=>setTimeout(r,25)); }
  throw new Error("DM revocation race barrier timed out");
}
async function waiting(name, type="Lock") {
  await until(()=>sql(`select count(*) from pg_stat_activity where application_name='${name}'
    and wait_event_type='${type}'`) === "1");
}
async function beforeLock(name,revoke,generation) {
  const writer=session(`dm_${name}_before_writer`), sender=session(`dm_${name}_before_sender`);
  try {
    writer.send(`begin; ${revoke}; select 'revoked_held';`);
    await until(()=>writer.output().includes("revoked_held"));
    sender.send(`begin; ${claims(a)} select public.send_dm_message('${b}','${generation}',
      '${crypto.randomUUID()}','Before ${name}'); commit;`);
    await waiting(`dm_${name}_before_sender`);
    writer.send("commit;"); writer.child.stdin.end(); sender.child.stdin.end();
    await writer.done; await sender.done;
    assert.match(sender.output(),/DM unavailable/,`${name} committed before lock must deny`);
  } finally { writer.child.kill(); sender.child.kill(); }
}
async function afterLock(name,revoke,generation) {
  const sender=session(`dm_${name}_after_sender`), writer=session(`dm_${name}_after_writer`);
  const before=Number(sql(`select count(*) from private.dm_messages where generation_id='${generation}'`));
  try {
    sender.send(`begin; ${claims(a)} select public.send_dm_message('${b}','${generation}',
      '${crypto.randomUUID()}','After ${name}'); select 'sent_held';`);
    await until(()=>sender.output().includes("sent_held"));
    writer.send(`begin; ${revoke}; commit; select 'revoked_committed';`);
    await waiting(`dm_${name}_after_writer`);
    sender.send("commit;"); sender.child.stdin.end(); writer.child.stdin.end();
    await sender.done; await writer.done;
    assert.match(writer.output(),/revoked_committed/,`${name} revocation commits after send`);
    assert.equal(Number(sql(`select count(*) from private.dm_messages
      where generation_id='${generation}'`)),before+1,`${name} prior send persists`);
    const subsequent=`begin; ${claims(a)} select count(*) from public.read_dm_messages('${b}',
      '${generation}'); commit;`;
    if (name==="dm_gate")
      assert.throws(()=>sql(subsequent),/DM unavailable/,`${name} subsequent reader is gated`);
    else
      assert.equal(sql(subsequent).split("\n")[0],"0",`${name} subsequent body read is empty`);
  } finally { sender.child.kill(); writer.child.kill(); }
}

test("DM sends serialize with both gates and live account, photo, campus and opt-in evidence", async () => {
  sql(`insert into auth.users(id,email,email_confirmed_at) values
    ('${a}','dm-revoke-a@unc.edu',now()),('${b}','dm-revoke-b@unc.edu',now());
    insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
      where id in ('${a}','${b}');
    update public.profiles set real_name='DM revocation',major='Science',graduation_year=2028,
      bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
      where user_id in ('${a}','${b}');
    insert into private.people_preferences(account_id,opted_in) values ('${a}',true),('${b}',true);
    insert into public.universities(id,slug,name,active,allowed_email_domains)
      values('${otherCampus}','dm-race-campus','DM race campus',true,array['unc.edu']);
    update private.people_feature_gate set enabled=true;
    update private.dm_feature_gate set enabled=true;`);
  try {
    const generation=sql(`begin; ${claims(a)} select public.create_dm_request('${b}',
      '${crypto.randomUUID()}','Initial'); commit;`).split("\n")[0];
    sql(`begin; ${claims(b)} select public.transition_dm('${a}','${generation}','accept'); commit;`);
    const cases=[
      { name:"dm_gate", revoke:"update private.dm_feature_gate set enabled=false",
        restore:"update private.dm_feature_gate set enabled=true" },
      { name:"people_gate", revoke:"update private.people_feature_gate set enabled=false",
        restore:"update private.people_feature_gate set enabled=true" },
      { name:"account", revoke:`update public.accounts set status='suspended' where id='${b}'`,
        restore:`update public.accounts set status='active' where id='${b}'` },
      { name:"photo", revoke:`update public.profiles set primary_photo_path=null where user_id='${b}'`,
        restore:`update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='${b}'` },
      { name:"campus", revoke:`update public.university_memberships set university_id='${otherCampus}' where user_id='${b}'`,
        restore:`update public.university_memberships set university_id='00000000-0000-4000-8000-000000000001' where user_id='${b}'` },
      { name:"preference", revoke:`update private.people_preferences set opted_in=false where account_id='${b}'`,
        restore:`update private.people_preferences set opted_in=true where account_id='${b}'` },
    ];
    for (const item of cases) {
      await beforeLock(item.name,item.revoke,generation);
      sql(item.restore);
      await afterLock(item.name,item.revoke,generation);
      sql(item.restore);
    }

    // Materialize the authorized RPC page before sleeping in the same SQL
    // statement. Revocation during PgSleep cannot recall that in-flight page.
    const reader=session("dm_inflight_body_read");
    try {
      reader.send(`begin; ${claims(a)} with page as materialized
        (select body from public.read_dm_messages('${b}','${generation}',p_limit=>1))
        select body,pg_sleep(2) from page; commit;`);
      await waiting("dm_inflight_body_read","Timeout");
      sql(`update private.people_preferences set opted_in=false where account_id='${b}'`);
      reader.child.stdin.end(); await reader.done;
      assert.match(reader.output(),/Initial/,"in-flight authorized page completes after revocation");
      assert.equal(sql(`begin; ${claims(a)} select count(*) from public.read_dm_messages('${b}',
        '${generation}'); commit;`).split("\n")[0],"0","later body page is empty");
    } finally { reader.child.kill(); }
  } finally {
    sql(`update private.dm_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in ('${a}','${b}');
      delete from private.dm_messages where author_id in ('${a}','${b}');
      delete from private.dm_pairs where low_id='${a}' and high_id='${b}';
      delete from private.dm_suppression where initiator_id in ('${a}','${b}');
      delete from auth.users where id in ('${a}','${b}');
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in ('${a}','${b}');
      delete from public.universities where id='${otherCampus}';`);
  }
});

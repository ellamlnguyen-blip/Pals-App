import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase",
  ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const url = status.API_URL, key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
function sql(statement) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
    "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
  { input: statement, encoding: "utf8" }).trim();
}
async function rpc(path, token, body = {}) {
  const response = await fetch(`${url}${path}`, { method: "POST",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`, "content-type": "application/json" },
    body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function signup() {
  const email = `notification-http-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await rpc("/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  sql(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  const login = await rpc("/auth/v1/token?grant_type=password", null, { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}

test("real Auth/PostgREST notification boundary and social transitions", async () => {
  const users = [];
  try {
    users.push(await signup(), await signup());
    const [a,b] = users;
    sql(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
      where id in ('${a.id}','${b.id}');
      update public.profiles set real_name='Notification HTTP',major='Science',graduation_year=2028,
        bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
        where user_id in ('${a.id}','${b.id}');
      insert into private.people_preferences(account_id,opted_in) values ('${a.id}',true),('${b.id}',true);
      update private.people_feature_gate set enabled=true;
      update private.friendship_feature_gate set enabled=true;
      update private.dm_feature_gate set enabled=true;`);
    assert.equal((await rpc("/rest/v1/rpc/list_notifications", a.token)).body.code, "42501");
    const sourceOff = await rpc("/rest/v1/rpc/create_friend_request", a.token,
      { p_target_id: b.id, p_request_id: crypto.randomUUID() });
    assert.equal(sourceOff.status, 200, JSON.stringify(sourceOff.body));
    assert.equal(sql("select count(*) from private.notification_items"), "0");
    sql("update private.notification_feature_gate set enabled=true");
    assert.equal((await rpc("/rest/v1/rpc/list_notifications", null)).status, 401);
    assert.equal((await rpc("/rest/v1/rpc/get_notification_preferences", a.token)).body.length, 4);
    assert.deepEqual((await rpc("/rest/v1/rpc/list_notifications", b.token)).body, []);
    const table = await fetch(`${url}/rest/v1/notification_items?select=*`,
      { headers: { apikey: key, authorization: `Bearer ${a.token}` } });
    assert.equal(table.status, 404);
    assert.equal((await rpc("/rest/v1/rpc/notification_emit", a.token,
      { p_recipient: b.id, p_kind: "dm", p_source: crypto.randomUUID(), p_target: crypto.randomUUID(),
        p_code: "dm_message", p_actor: a.id, p_category: "messages" })).status, 404);
    const accepted = await rpc("/rest/v1/rpc/accept_friend_request", b.token,
      { p_peer_id: a.id, p_generation_id: sourceOff.body });
    assert.equal(accepted.body, true);
    assert.deepEqual((await rpc("/rest/v1/rpc/list_notifications", a.token)).body.map((x) => x.event_code), ["friend_accepted"]);
    const dmKey = crypto.randomUUID();
    const dm = await rpc("/rest/v1/rpc/create_dm_request", a.token,
      { p_target_id: b.id, p_request_id: dmKey, p_body: "private request text" });
    assert.equal(dm.status, 200, JSON.stringify(dm.body));
    const incoming = (await rpc("/rest/v1/rpc/list_notifications", b.token)).body;
    assert.equal(incoming.length, 1);
    assert.equal(incoming[0].event_code, "dm_request");
    assert.equal(JSON.stringify(incoming).includes("private request text"), false);
    assert.equal((await rpc("/rest/v1/rpc/mark_notification_read", a.token,
      { p_notification_id: incoming[0].notification_id })).body, false);
    assert.equal((await rpc("/rest/v1/rpc/mark_notification_read", b.token,
      { p_notification_id: incoming[0].notification_id })).body, true);
    const readAt = (await rpc("/rest/v1/rpc/list_notifications", b.token)).body[0].read_at;
    assert.equal((await rpc("/rest/v1/rpc/mark_notification_read", b.token,
      { p_notification_id: incoming[0].notification_id })).body, true);
    assert.equal((await rpc("/rest/v1/rpc/list_notifications", b.token)).body[0].read_at, readAt);
    assert.equal((await rpc("/rest/v1/rpc/transition_dm", b.token,
      { p_peer_id: a.id, p_generation_id: dm.body, p_action: "reply",
        p_reply_request_id: crypto.randomUUID(), p_reply_body: "first reply" })).body, true);
    const sent = await rpc("/rest/v1/rpc/send_dm_message", a.token,
      { p_peer_id: b.id, p_generation_id: dm.body, p_request_id: crypto.randomUUID(), p_body: "later text" });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    const aPage = (await rpc("/rest/v1/rpc/list_notifications", a.token)).body;
    assert.deepEqual(aPage.map((x) => x.event_code), ["dm_accepted", "friend_accepted"]);
    const bPage = (await rpc("/rest/v1/rpc/list_notifications", b.token)).body;
    assert.deepEqual(bPage.map((x) => x.event_code), ["dm_message", null]);
    assert.equal(bPage[1].label, "Unavailable");
    assert.equal((await rpc("/rest/v1/rpc/list_notifications", b.token, { p_limit: 25 })).body.code, "22023");
    const pageOne = (await rpc("/rest/v1/rpc/list_notifications", b.token, { p_limit: 1 })).body;
    const pageTwo = (await rpc("/rest/v1/rpc/list_notifications", b.token,
      { p_after_created_at: pageOne[0].created_at, p_after_id: pageOne[0].notification_id, p_limit: 1 })).body;
    assert.equal(pageTwo.length, 1);
    assert.notEqual(pageOne[0].notification_id, pageTwo[0].notification_id);
    sql(`update private.people_preferences set opted_in=false where account_id='${a.id}'`);
    const revoked = (await rpc("/rest/v1/rpc/list_notifications", b.token)).body;
    assert.ok(revoked.every((x) => x.label === "Unavailable" && x.actor_id === null && x.target_id === null));
    assert.equal((await rpc("/rest/v1/rpc/set_notification_preference", b.token,
      { p_category: "messages", p_enabled: false })).body, false);
    sql("update private.notification_feature_gate set enabled=false");
    assert.equal((await rpc("/rest/v1/rpc/list_notifications", b.token)).body.code, "42501");
    assert.equal((await rpc("/rest/v1/rpc/set_notification_preference", b.token,
      { p_category: "messages", p_enabled: true })).body.code, "42501");
    sql("update private.notification_feature_gate set enabled=true");
    sql(`update public.profiles set primary_photo_path=null where user_id='${b.id}'`);
    assert.equal((await rpc("/rest/v1/rpc/get_notification_preferences", b.token)).body.find((x) => x.category === "messages").enabled, false);
    sql(`update public.accounts set status='suspended' where id='${b.id}'`);
    assert.equal((await rpc("/rest/v1/rpc/list_notifications", b.token)).body.code, "42501");
  } finally {
    const ids = users.map((u) => `'${u.id}'`).join(",") || "null";
    sql(`update private.notification_feature_gate set enabled=false;
      update private.dm_feature_gate set enabled=false;
      update private.friendship_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in (${ids});
      delete from private.dm_messages where author_id in (${ids});
      delete from private.dm_pairs where low_id in (${ids}) or high_id in (${ids});
      delete from private.notification_items where recipient_id in (${ids}) or actor_id in (${ids});
      delete from private.notification_preferences where recipient_id in (${ids});
      delete from auth.users where id in (${ids});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${ids});`);
  }
});

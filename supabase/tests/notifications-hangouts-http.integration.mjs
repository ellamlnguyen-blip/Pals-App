import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase", ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const db = (statement) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: statement, encoding: "utf8" }).trim();
async function post(path, token, body = {}) {
  const response = await fetch(`${url}${path}`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${token ?? key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
const rpc = (name, token, body) => post(`/rest/v1/rpc/${name}`, token, body);
async function signup() {
  const email = `notice-hangout-${crypto.randomUUID()}@unc.edu`, password = `Local-only-${crypto.randomUUID()}`;
  const created = await post("/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  db(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  const login = await post("/auth/v1/token?grant_type=password", null, { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}
function expect(result, code = 200) { assert.equal(result.status, code, JSON.stringify(result.body)); return result.body; }
const codes = (items) => items.map((item) => item.event_code);

test("real Auth and PostgREST Hangout notices follow committed source rights", async () => {
  const users = [];
  let hangout;
  try {
    users.push(await signup(), await signup(), await signup());
    const [host, peer, outsider] = users;
    const ids = users.map((u) => `'${u.id}'`).join(",");
    db(`insert into storage.objects(bucket_id,name,owner_id) select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in (${ids});
      update public.profiles set real_name='Notice HTTP',major='Science',graduation_year=2028,bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in (${ids});
      update private.hangout_feature_gate set enabled=true;
      update private.hangout_chat_feature_gate set enabled=true;
      update private.notification_feature_gate set enabled=true;`);
    const start = new Date(Date.now() + 3600000).toISOString();
    hangout = expect(await rpc("create_hangout", host.token, { p_request_id: crypto.randomUUID(), p_title: "Tacos", p_starts_at: start, p_public_place: "Area", p_public_latitude: 35, p_public_longitude: -79 }));
    assert.deepEqual(expect(await rpc("list_notifications", outsider.token)), []);
    expect(await rpc("join_hangout", peer.token, { p_hangout_id: hangout }), 204);
    expect(await rpc("join_hangout", peer.token, { p_hangout_id: hangout }), 204);
    let hostItems = expect(await rpc("list_notifications", host.token));
    assert.deepEqual(codes(hostItems), ["hangout_joined"]);
    assert.equal(hostItems[0].actor_id, null);
    assert.equal(hostItems[0].target_id, hangout);
    const forged = await rpc("notification_emit_hangout", peer.token, { p_event: crypto.randomUUID(), p_hangout: hangout, p_actor: outsider.id, p_code: "hangout_edited" });
    assert.equal(forged.status, 404);
    const table = await fetch(`${url}/rest/v1/notification_items?select=*`, { headers: { apikey: key, authorization: `Bearer ${peer.token}` } });
    assert.equal(table.status, 404);
    assert.equal(expect(await rpc("edit_hangout", host.token, { p_hangout_id: hangout, p_expected_revision: 1, p_title: "Tacos", p_starts_at: start, p_public_place: "Area", p_public_latitude: 35, p_public_longitude: -79, p_private_instructions: "Secret room" })), 2);
    assert.equal(expect(await rpc("edit_hangout", host.token, { p_hangout_id: hangout, p_expected_revision: 2, p_title: " Tacos ", p_starts_at: start, p_public_place: "Area", p_public_latitude: 35, p_public_longitude: -79, p_private_instructions: " Secret room " })), 3);
    assert.equal((await rpc("edit_hangout", host.token, { p_hangout_id: hangout, p_expected_revision: 2, p_title: "Wrong", p_starts_at: start, p_public_place: "Area", p_public_latitude: 35, p_public_longitude: -79 })).body.code, "40001");
    let peerItems = expect(await rpc("list_notifications", peer.token));
    assert.deepEqual(codes(peerItems), ["hangout_edited"]);
    assert.equal(JSON.stringify(peerItems).includes("Secret room"), false);
    const keyId = crypto.randomUUID();
    const first = expect(await rpc("send_hangout_message", host.token, { p_hangout_id: hangout, p_request_id: keyId, p_body: "Private chat body" }));
    assert.equal(expect(await rpc("send_hangout_message", host.token, { p_hangout_id: hangout, p_request_id: keyId, p_body: "Private chat body" }))[0].message_id, first[0].message_id);
    peerItems = expect(await rpc("list_notifications", peer.token));
    assert.deepEqual(codes(peerItems), ["hangout_chat_message", "hangout_edited"]);
    assert.equal(peerItems[0].actor_id, null);
    assert.equal(JSON.stringify(peerItems).includes("Private chat body"), false);
    assert.deepEqual(expect(await rpc("list_notifications", outsider.token)), []);
    expect(await rpc("leave_hangout", peer.token, { p_hangout_id: hangout }), 204);
    peerItems = expect(await rpc("list_notifications", peer.token));
    assert.deepEqual(codes(peerItems), [null, null]);
    assert.ok(peerItems.every((item) => item.target_id === null && item.label === "Unavailable"));
    hostItems = expect(await rpc("list_notifications", host.token));
    assert.deepEqual(codes(hostItems).slice(0, 2), ["hangout_left", "hangout_joined"]);
    assert.ok(hostItems.slice(0, 2).every((item) => item.actor_id === null));
    expect(await rpc("join_hangout", peer.token, { p_hangout_id: hangout }), 204);
    hostItems = expect(await rpc("list_notifications", host.token));
    assert.equal(hostItems.filter((item) => item.event_code === "hangout_joined").length, 2);
    assert.equal(new Set(hostItems.filter((item) => item.event_code === "hangout_joined").map((item) => item.source_id)).size, 2);
    expect(await rpc("set_notification_preference", peer.token, { p_category: "hangout_updates", p_enabled: false }));
    expect(await rpc("cancel_hangout", host.token, { p_hangout_id: hangout, p_expected_revision: 3 }));
    peerItems = expect(await rpc("list_notifications", peer.token));
    assert.equal(peerItems[0].event_code, "hangout_cancelled");
    assert.equal(peerItems[0].target_id, hangout);
    assert.equal(peerItems.find((item) => item.label === "Unavailable")?.target_id, null);
    assert.deepEqual(expect(await rpc("list_notifications", outsider.token)), []);
    assert.equal(db(`select count(*) from private.notification_items where event_code='hangout_chat_message' and recipient_id='${peer.id}'`), "1");
  } finally {
    const ids = users.map((u) => `'${u.id}'`).join(",") || "null";
    const target = hangout ?? "00000000-0000-0000-0000-000000000000";
    db(`update private.notification_feature_gate set enabled=false;
      update private.hangout_chat_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      delete from private.notification_items where recipient_id in (${ids}) or actor_id in (${ids});
      delete from private.notification_preferences where recipient_id in (${ids});
      set chat.allow_fixture_cleanup='true';
      delete from private.hangout_message_requests where hangout_id='${target}';
      delete from private.hangout_messages where conversation_id in (select id from private.hangout_conversations where hangout_id='${target}');
      delete from private.hangout_conversations where hangout_id='${target}';
      delete from private.hangout_create_requests where hangout_id='${target}';
      delete from public.hangouts where id='${target}';
      update public.profiles set primary_photo_path=null where user_id in (${ids});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${ids});
      delete from auth.users where id in (${ids});`);
  }
});

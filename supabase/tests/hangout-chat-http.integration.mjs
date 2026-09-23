import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321", "disposable loopback Supabase required");
const url = status.API_URL;
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
function sql(statement) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: statement, encoding: "utf8" }).trim();
}
async function post(path, token, body = {}) {
  const response = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function signup() {
  const email = `chat-http-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await post("/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  sql(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  const login = await post("/auth/v1/token?grant_type=password", null, { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}
const rpc = (name, token, body) => post(`/rest/v1/rpc/${name}`, token, body);

test("real Auth/PostgREST chat calls enforce membership, retries and private storage", async () => {
  const users = [];
  let hangout;
  try {
    users.push(await signup(), await signup());
    const [host, peer] = users;
    sql(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
      where id in ('${host.id}','${peer.id}');
      update public.profiles set real_name='Chat HTTP',major='Science',graduation_year=2028,
        bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
        where user_id in ('${host.id}','${peer.id}');`);
    const request = { p_request_id: crypto.randomUUID(), p_title: "Chat", p_starts_at: new Date(Date.now() + 3600000).toISOString(),
      p_public_place: "Campus area", p_public_latitude: 35.913, p_public_longitude: -79.055 };
    assert.equal((await rpc("read_hangout_messages", host.token, { p_hangout_id: crypto.randomUUID() })).body.code, "42501");
    sql("update private.hangout_feature_gate set enabled=true; update private.hangout_chat_feature_gate set enabled=true;");
    const made = await rpc("create_hangout", host.token, request);
    assert.equal(made.status, 200, JSON.stringify(made.body));
    hangout = made.body;
    assert.deepEqual((await rpc("read_hangout_messages", host.token, { p_hangout_id: hangout })).body, []);
    const keyId = crypto.randomUUID();
    const send = await rpc("send_hangout_message", host.token, { p_hangout_id: hangout, p_request_id: keyId, p_body: "  Hello  " });
    assert.equal(send.status, 200, JSON.stringify(send.body));
    assert.equal(send.body[0].body, "Hello");
    assert.equal(send.body[0].author_id, host.id);
    assert.equal((await rpc("send_hangout_message", host.token, { p_hangout_id: hangout, p_request_id: keyId, p_body: "Hello" })).body[0].message_id, send.body[0].message_id);
    assert.equal((await rpc("send_hangout_message", host.token, { p_hangout_id: hangout, p_request_id: keyId, p_body: "Changed" })).body.code, "23505");
    assert.equal((await rpc("read_hangout_messages", peer.token, { p_hangout_id: hangout })).body.code, "42501");
    assert.equal((await rpc("join_hangout", peer.token, { p_hangout_id: hangout })).status, 204);
    assert.equal((await rpc("read_hangout_messages", peer.token, { p_hangout_id: hangout })).body[0].author_id, host.id);
    assert.equal((await rpc("leave_hangout", peer.token, { p_hangout_id: hangout })).status, 204);
    assert.equal((await rpc("read_hangout_messages", peer.token, { p_hangout_id: hangout })).body.code, "42501");
    for (const table of ["hangout_conversations", "hangout_messages", "hangout_message_requests", "hangout_chat_feature_gate"]) {
      const response = await fetch(`${url}/rest/v1/${table}?select=*`, { headers: { apikey: key, authorization: `Bearer ${host.token}` } });
      assert.equal(response.status, 404, `${table} absent from exposed REST schema`);
    }
    const anon = await rpc("read_hangout_messages", null, { p_hangout_id: hangout });
    assert.ok([401, 403].includes(anon.status));
    sql("update private.hangout_chat_feature_gate set enabled=false");
    assert.equal((await rpc("read_hangout_messages", host.token, { p_hangout_id: hangout })).body.code, "42501");
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
      update public.profiles set primary_photo_path=null where user_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      delete from auth.users where id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});`);
  }
});

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const url = status.API_URL, key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
function sql(statement) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt",
    "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
  { input: statement, encoding: "utf8" }).trim();
}
async function call(path, token, body = {}) {
  const response = await fetch(`${url}${path}`, { method: "POST",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`, "content-type": "application/json" },
    body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function signup() {
  const email = `dm-http-${crypto.randomUUID()}@unc.edu`, password = `Local-only-${crypto.randomUUID()}`;
  const created = await call("/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  sql(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  const login = await call("/auth/v1/token?grant_type=password", null, { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}

test("real Auth sessions enforce DM consent and revocation", async () => {
  const users = [];
  try {
    users.push(await signup(), await signup());
    const [a,b] = users;
    sql(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
      where id in ('${a.id}','${b.id}');
      update public.profiles set real_name='DM HTTP',major='Science',graduation_year=2028,
        bio='Local fixture',primary_photo_path=user_id::text||'/primary.png'
        where user_id in ('${a.id}','${b.id}');
      insert into private.people_preferences(account_id,opted_in) values ('${a.id}',true),('${b.id}',true);
      update private.people_feature_gate set enabled=true;
      update private.dm_feature_gate set enabled=true;`);
    const anon = await call("/rest/v1/rpc/list_dm_inbox", null);
    assert.ok([401,403].includes(anon.status));
    const request = crypto.randomUUID();
    const created = await call("/rest/v1/rpc/create_dm_request", a.token,
      { p_target_id: b.id, p_request_id: request, p_body: " Hello " });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const generation = created.body;
    const incoming = await call("/rest/v1/rpc/list_dm_inbox", b.token);
    assert.equal(incoming.body?.[0]?.first_body, "Hello");
    assert.equal(incoming.body?.[0]?.direction, "incoming");
    const outgoing = await call("/rest/v1/rpc/list_dm_inbox", a.token);
    assert.equal(outgoing.body?.[0]?.first_body, null);
    const direct = await fetch(`${url}/rest/v1/dm_messages?select=*`,
      { headers: { apikey: key, authorization: `Bearer ${a.token}` } });
    assert.equal(direct.status, 404);
    const accepted = await call("/rest/v1/rpc/transition_dm", b.token,
      { p_peer_id: a.id, p_generation_id: generation, p_action: "reply",
        p_reply_request_id: crypto.randomUUID(), p_reply_body: "Yes" });
    assert.equal(accepted.body, true);
    const sent = await call("/rest/v1/rpc/send_dm_message", a.token,
      { p_peer_id: b.id, p_generation_id: generation, p_request_id: crypto.randomUUID(), p_body: "See you" });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    const page = await call("/rest/v1/rpc/read_dm_messages", b.token,
      { p_peer_id: a.id, p_generation_id: generation, p_limit: 2 });
    assert.deepEqual(page.body.map((m) => m.body), ["Hello","Yes"]);
    sql(`update private.people_preferences set opted_in=false where account_id='${a.id}'`);
    const paused = await call("/rest/v1/rpc/read_dm_messages", b.token,
      { p_peer_id: a.id, p_generation_id: generation });
    assert.deepEqual(paused.body, []);
    assert.equal((await call("/rest/v1/rpc/send_dm_message", b.token,
      { p_peer_id: a.id, p_generation_id: generation,
        p_request_id: crypto.randomUUID(), p_body: "No" })).body.code, "42501");
    sql(`update private.dm_feature_gate set enabled=false`);
    assert.equal((await call("/rest/v1/rpc/set_people_block", b.token,
      { p_account_id: a.id, p_blocked: true })).body, true);
    sql(`update private.dm_feature_gate set enabled=true`);
    assert.deepEqual((await call("/rest/v1/rpc/list_dm_inbox", b.token)).body, []);
  } finally {
    sql(`update private.dm_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      delete from private.dm_messages where author_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      delete from private.dm_pairs where low_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"})
        or high_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      delete from private.dm_suppression where initiator_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"})
        or recipient_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      delete from auth.users where id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});`);
  }
});

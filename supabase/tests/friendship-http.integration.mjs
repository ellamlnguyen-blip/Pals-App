import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321", "disposable loopback Supabase required");
const url = status.API_URL, key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
function sql(statement) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
    { input: statement, encoding: "utf8" }).trim();
}
async function call(path, token, body = {}) {
  const response = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
async function signup() {
  const email = `friend-http-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await call("/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  assert.ok(id, `Auth signup returned no user ID: ${Object.keys(created.body)}`);
  sql(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  const login = await call("/auth/v1/token?grant_type=password", null, { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}

test("real Auth sessions reach only caller-owned friendship RPCs", async () => {
  const users = [];
  try {
    users.push(await signup(), await signup());
    const [a,b] = users;
    sql(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${a.id}','${b.id}');
      update public.profiles set real_name='Local friend',major='Science',graduation_year=2028,
        bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${a.id}','${b.id}');
      update private.people_feature_gate set enabled=true;
      update private.friendship_feature_gate set enabled=true;
      insert into private.people_preferences(account_id,opted_in) values ('${a.id}',true),('${b.id}',true);`);
    const anon = await call("/rest/v1/rpc/list_friendships", null);
    assert.ok([401,403].includes(anon.status));
    const requestId = crypto.randomUUID();
    const created = await call("/rest/v1/rpc/create_friend_request", a.token,
      { p_target_id: b.id, p_request_id: requestId });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    const generation = created.body;
    const outgoing = await call("/rest/v1/rpc/get_friendship", a.token, { p_peer_id: b.id });
    assert.deepEqual(outgoing.body, [{ peer_id: b.id, generation_id: generation, direction: "outgoing", state: "pending" }]);
    const incoming = await call("/rest/v1/rpc/list_friendships", b.token);
    assert.deepEqual(incoming.body, [{ peer_id: a.id, generation_id: generation, direction: "incoming", state: "pending" }]);
    const direct = await fetch(`${url}/rest/v1/friendships?select=*`, { headers: { apikey: key, authorization: `Bearer ${a.token}` } });
    assert.equal(direct.status, 404, "private pair table is absent from REST schema");
    assert.equal((await call("/rest/v1/rpc/create_friend_request", a.token,
      { p_target_id: a.id, p_request_id: crypto.randomUUID() })).body.code, "42501");
    assert.equal((await call("/rest/v1/rpc/create_friend_request", a.token,
      { p_target_id: b.id, p_request_id: requestId })).body, generation);
    const accepted = await call("/rest/v1/rpc/accept_friend_request", b.token,
      { p_peer_id: a.id, p_generation_id: generation });
    assert.equal(accepted.body, true);
    const stale = await call("/rest/v1/rpc/unfriend", a.token,
      { p_peer_id: b.id, p_generation_id: crypto.randomUUID() });
    assert.equal(stale.body.code, "42501");
    assert.equal((await call("/rest/v1/rpc/unfriend", a.token,
      { p_peer_id: b.id, p_generation_id: generation })).body, true);
    assert.equal((await call("/rest/v1/rpc/create_friend_request", a.token,
      { p_target_id: b.id, p_request_id: requestId })).body.code, "42501");
  } finally {
    sql(`update private.friendship_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      delete from auth.users where id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${users.map((u) => `'${u.id}'`).join(",") || "null"});`);
  }
});

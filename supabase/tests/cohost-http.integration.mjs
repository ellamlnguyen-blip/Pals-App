import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
assert.match(status.DB_URL, /^postgresql?:\/\/postgres:[^@]*@127\.0\.0\.1:54322\/postgres$/);
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const db = (input) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
{ input, encoding: "utf8" }).trim();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
async function request(path, token, body) {
  const response = await fetch(`${status.API_URL}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null };
}
const rpc = (name, token, body = {}) => request(`/rest/v1/rpc/${name}`, token, body);
function ok(result) { assert.ok([200, 204].includes(result.status), JSON.stringify(result.body)); return result.body; }
function denied(result) { assert.ok([400, 401, 403, 404].includes(result.status), JSON.stringify(result)); }
async function signup() {
  const email = `task010a-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = ok(await request("/auth/v1/signup", null, { email, password }));
  const id = created.user?.id ?? created.id;
  db(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
  const login = ok(await request("/auth/v1/token?grant_type=password", null,
    { email, password }));
  return { id, token: login.access_token };
}

test("real Auth and PostgREST enforce current cohost authority and private reads", {
  concurrency: false, timeout: 120_000,
}, async () => {
  const users = await Promise.all([signup(), signup(), signup(), signup()]);
  const [host, cohost, ordinary, moderator] = users;
  let hangout;
  try {
    const ids = users.map((u) => quote(u.id)).join(",");
    db(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
      where id in (${ids});
      update public.profiles set real_name='Cohost HTTP',major='Science',
        graduation_year=2028,bio='Local',primary_photo_path=user_id::text||'/primary.png'
      where user_id in (${ids});
      insert into public.platform_roles(user_id,role) values(${quote(moderator.id)},'moderator');
      update private.hangout_feature_gate set enabled=true;`);
    hangout = ok(await rpc("create_hangout", host.token, {
      p_request_id: crypto.randomUUID(), p_title: "Original",
      p_starts_at: new Date(Date.now() + 3_600_000).toISOString(),
      p_public_place: "Area", p_public_latitude: 35.913,
      p_public_longitude: -79.055, p_private_instructions: "Old door",
    }));
    ok(await rpc("join_hangout", cohost.token, { p_hangout_id: hangout }));
    ok(await rpc("join_hangout", ordinary.token, { p_hangout_id: hangout }));
    denied(await rpc("remove_hangout_participant", host.token,
      { p_hangout_id: hangout, p_account_id: ordinary.id }));
    denied(await request("/rest/v1/hangout_cohosts?select=*", host.token));
    denied(await rpc("promote_hangout_cohost", moderator.token,
      { p_hangout_id: hangout, p_account_id: moderator.id, p_expected_revision: 1 }));
    assert.equal(ok(await rpc("promote_hangout_cohost", host.token,
      { p_hangout_id: hangout, p_account_id: cohost.id, p_expected_revision: 1 })), 2);
    const roles = ok(await rpc("list_hangout_roster_roles", ordinary.token,
      { p_hangout_id: hangout }));
    assert.deepEqual(Object.keys(roles[0]).sort(), ["account_id", "role_label"]);
    assert.equal(roles.find((row) => row.account_id === cohost.id).role_label, "cohost");
    denied(await rpc("list_hangout_cohosts", cohost.token, { p_hangout_id: hangout }));
    assert.deepEqual(ok(await rpc("list_hangout_cohosts", host.token,
      { p_hangout_id: hangout })), [{ account_id: cohost.id }]);
    denied(await rpc("get_hangout_large_state", cohost.token,
      { p_hangout_id: hangout }));
    const original = ok(await request(`/rest/v1/hangouts?id=eq.${hangout}&select=*`, ordinary.token))[0];
    assert.ok(!JSON.stringify(original).includes("Old door"));
    assert.equal(ok(await rpc("edit_hangout", cohost.token, {
      p_hangout_id: hangout, p_expected_revision: 2, p_title: "Edited",
      p_starts_at: original.starts_at, p_public_place: "Area",
      p_public_latitude: 35.913, p_public_longitude: -79.055,
      p_private_instructions: "New door",
    })), 3);
    const privateRow = ok(await request(`/rest/v1/hangout_private_locations?hangout_id=eq.${hangout}&select=instructions`, ordinary.token));
    assert.deepEqual(privateRow, [{ instructions: "New door" }]);
    assert.equal(ok(await rpc("set_hangout_joining", cohost.token,
      { p_hangout_id: hangout, p_expected_revision: 3, p_joining_state: "closed" })), 4);
    denied(await rpc("cancel_hangout", cohost.token,
      { p_hangout_id: hangout, p_expected_revision: 4 }));
    denied(await rpc("remove_hangout_participant", ordinary.token,
      { p_hangout_id: hangout, p_account_id: cohost.id, p_expected_revision: 4 }));
    assert.equal(ok(await rpc("demote_hangout_cohost", host.token,
      { p_hangout_id: hangout, p_account_id: cohost.id, p_expected_revision: 4 })), 5);
    denied(await rpc("edit_hangout", cohost.token, {
      p_hangout_id: hangout, p_expected_revision: 5, p_title: "Denied",
      p_starts_at: original.starts_at, p_public_place: "Area",
      p_public_latitude: 35.913, p_public_longitude: -79.055,
    }));
    assert.deepEqual(ok(await request(`/rest/v1/hangout_private_locations?hangout_id=eq.${hangout}&select=instructions`, cohost.token)),
      [{ instructions: "New door" }], "demotion retains joined private access");
    ok(await rpc("leave_hangout", cohost.token, { p_hangout_id: hangout }));
    assert.deepEqual(ok(await request(`/rest/v1/hangout_private_locations?hangout_id=eq.${hangout}&select=instructions`, cohost.token)),
      [], "leave revokes future private reads");
    assert.equal(ok(await rpc("remove_hangout_participant", host.token,
      { p_hangout_id: hangout, p_account_id: cohost.id, p_expected_revision: 5 })), 6);
  } finally {
    db(`update private.hangout_feature_gate set enabled=false;
      delete from private.hangout_create_requests where host_id in (${users.map((u) => quote(u.id)).join(",")});
      ${hangout ? `delete from public.hangouts where id=${quote(hangout)};` : ""}
      delete from auth.users where id in (${users.map((u) => quote(u.id)).join(",")});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${users.map((u) => quote(u.id)).join(",")});`);
  }
});

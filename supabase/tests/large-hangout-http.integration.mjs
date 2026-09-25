import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase",
  ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const sql = (input) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
{ input, encoding: "utf8" }).trim();
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
async function request(path, token, body) {
  const response = await fetch(`${status.API_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: { apikey: key, authorization: `Bearer ${token ?? key}`,
      ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  return { status: response.status, body: raw ? JSON.parse(raw) : null };
}
const rpc = (name, token, body = {}) => request(`/rest/v1/rpc/${name}`, token, body);
async function signup() {
  const email = `task020a-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await request("/auth/v1/signup", null, { email, password });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const id = created.body.user?.id ?? created.body.id;
  sql(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
  const login = await request("/auth/v1/token?grant_type=password", null, { email, password });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id, token: login.body.access_token };
}
const savedParams = (cutoff) => ({ p_west: -79.13, p_south: 35.85,
  p_east: -78.98, p_north: 35.97, p_time_filter: "all",
  p_joining_filter: "any", p_cutoff: cutoff });
const fields = ["campus_zone", "description", "ends_at", "id", "joining_state",
  "public_latitude", "public_longitude", "public_place", "starts_at", "title"];
function denied(result) {
  assert.ok([401, 403].includes(result.status), JSON.stringify(result));
  assert.equal(result.body?.code, "42501");
}
// This is the exact Stage B adapter sequence: two identical RPC reads around
// a fresh get_access_state, compare all 101 projected rows, mode and epoch.
async function twoRead(user, params, between = async () => {}) {
  const first = await rpc("query_saved_hangouts", user.token, params);
  if (first.status !== 200) return { kind: "error", items: [] };
  const access = await rpc("get_access_state", user.token);
  if (access.status !== 200 || access.body !== "ready") return { kind: "denied", items: [] };
  await between();
  const second = await rpc("query_saved_hangouts", user.token, params);
  if (second.status !== 200 || JSON.stringify(first.body.pins) !== JSON.stringify(second.body.pins)
    || first.body.epoch !== second.body.epoch
    || first.body.ranking_mode !== second.body.ranking_mode)
    return { kind: "error", items: [] };
  return { kind: "ok", items: first.body.pins.slice(0, 100),
    truncated: first.body.pins.length > 100, rankingMode: first.body.ranking_mode };
}

test("real Auth/PostgREST large-Hangout discovery revalidation", {
  concurrency: false, timeout: 120_000,
}, async () => {
  const [host, viewer, moderator] = await Promise.all([signup(), signup(), signup()]);
  let hangout;
  try {
    sql(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text from public.accounts
      where id in (${[host, viewer, moderator].map((u) => quote(u.id)).join(",")});
      update public.profiles set real_name='Local fixture',major='Science',
        graduation_year=2028,bio='Local',primary_photo_path=user_id::text||'/primary.png'
      where user_id in (${[host, viewer, moderator].map((u) => quote(u.id)).join(",")});
      insert into public.platform_roles(user_id,role) values(${quote(moderator.id)},'moderator');
      update private.hangout_feature_gate set enabled=true;`);
    denied(await rpc("get_hangout_large_state", host.token, { p_hangout_id: crypto.randomUUID() }));
    denied(await rpc("query_saved_hangouts", null, savedParams(new Date().toISOString())));
    const made = await rpc("create_hangout", host.token, {
      p_request_id: crypto.randomUUID(), p_title: "Large local fixture",
      p_starts_at: new Date(Date.now() + 3_600_000).toISOString(),
      p_public_place: "Campus area", p_public_latitude: 35.913,
      p_public_longitude: -79.055,
    });
    assert.equal(made.status, 200, JSON.stringify(made));
    hangout = made.body;
    const params = savedParams(new Date().toISOString());
    const stable = await twoRead(viewer, params);
    assert.equal(stable.kind, "ok");
    assert.deepEqual(stable.items.map((pin) => pin.id), [hangout]);
    assert.equal(stable.truncated, false);
    assert.equal(stable.rankingMode, "chronological");
    const first = await rpc("query_saved_hangouts", viewer.token, params);
    assert.equal(first.status, 200, JSON.stringify(first));
    assert.deepEqual(Object.keys(first.body.pins[0]).sort(), fields);
    assert.deepEqual(Object.keys(first.body).sort(), ["epoch", "pins", "ranking_mode"]);
    assert.equal(first.body.pins[0].id, hangout);
    assert.equal((await rpc("get_hangout_large_state", host.token,
      { p_hangout_id: hangout })).status, 403, "safeguard off denies host size");
    sql("update private.large_hangout_feature_gate set enabled=true");
    assert.equal((await rpc("get_hangout_large_state", host.token,
      { p_hangout_id: hangout })).body[0].is_large, false);
    denied(await rpc("get_hangout_large_state", viewer.token, { p_hangout_id: hangout }));
    denied(await rpc("get_hangout_large_state", moderator.token, { p_hangout_id: hangout }));
    assert.equal((await request("/rest/v1/large_hangout_signals?select=*", moderator.token)).status,
      404, "private signal absent from REST");
    assert.equal((await rpc("record_large_hangout_join", host.token,
      { p_hangout_id: hangout })).status, 404, "private writer absent from PostgREST");
    assert.deepEqual((await twoRead(viewer, params)).rankingMode, "small_first");
    assert.deepEqual(await twoRead(viewer, params, async () => {
      sql("update private.large_hangout_feature_gate set enabled=false");
    }), { kind: "error", items: [] }, "gate flip between reads discards all items");
    sql("update private.large_hangout_feature_gate set enabled=true");
    assert.deepEqual(await twoRead(viewer, params, async () => {
      sql(`update public.hangouts set status='cancelled',joining_state='closed',
        revision=revision+1 where id=${quote(hangout)}`);
    }), { kind: "error", items: [] }, "source mutation between reads discards all items");
    assert.deepEqual((await twoRead(viewer, params)).items, [],
      "later read sees cancelled source absent");
    assert.equal(sql(`select count(*) from private.large_hangout_signals
      where hangout_id=${quote(hangout)}`), "0");
  } finally {
    sql(`update private.large_hangout_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;`);
  }
});

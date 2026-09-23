import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
const origin = process.env.WEB_TEST_ORIGIN;
assert.equal(origin, "http://127.0.0.1:3000");
const status = JSON.parse(execFileSync("pnpm", ["exec", "supabase", "status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createServerClient } = require("@supabase/ssr");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const sql = (statement) => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: statement, encoding: "utf8" }).trim();
function client() {
  const jar = new Map();
  const auth = createServerClient(status.API_URL, key, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: values => { for (const {name,value} of values) jar.set(name,value); } } });
  return { auth, cookie: () => [...jar].map(([name,value]) => `${name}=${value}`).join("; ") };
}
async function signup() {
  const instance = client();
  const email = `notification-ui-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await instance.auth.auth.signUp({ email, password });
  assert.equal(created.error, null);
  const id = created.data.user.id;
  sql(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  assert.equal((await instance.auth.auth.signInWithPassword({ email, password })).error, null);
  return { ...instance, id };
}
async function api(user, path = "", body, actor = user?.id) {
  const response = await fetch(`${origin}/api/notifications${path}`, { method: body ? "POST" : "GET", headers: { Cookie: user?.cookie() ?? "", "x-pals-notification-actor": actor ?? "", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body), redirect: "manual" });
  const data = await response.json();
  assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
  return { response, data };
}
test("local Notifications API has owner continuity, bounded pages and preference/read honesty", async () => {
  const users = [];
  try {
    const anonymous = await api(null);
    assert.equal(anonymous.response.status, 403);
    assert.deepEqual(anonymous.data, { kind: "denied" });
    users.push(await signup(), await signup());
    const [a,b] = users;
    sql(`update private.notification_feature_gate set enabled=true;`);
    assert.equal((await api(a, "?probe=1", undefined, b.id)).response.status, 403);
    assert.equal((await api(a, "?probe=1")).response.status, 200);
    const empty = await api(a);
    assert.equal(empty.response.status, 200);
    assert.deepEqual(empty.data.rows, []);
    assert.equal(empty.data.preferences.length, 4);
    assert.equal((await api(a, "?time=2026-09-23T00%3A00%3A00Z")).response.status, 400);
    assert.equal((await api(a, "?time=2026-09-23T00%3A00%3A00Z&id=bad")).response.status, 400);
    const ids = Array.from({ length: 25 }, () => crypto.randomUUID());
    sql(`insert into private.notification_items(id,recipient_id,source_kind,source_id,target_id,event_code,actor_id)
      select id,'${a.id}','friendship',id,id,'friend_request','${b.id}' from unnest(array[${ids.map(x=>`'${x}'`).join(",")}]::uuid[]) id;`);
    const first = await api(a);
    assert.equal(first.data.rows.length, 24);
    assert.ok(first.data.rows.every(x => x.label === "Unavailable" && x.actor_id === null && x.target_id === null));
    const last = first.data.rows.at(-1);
    const older = await api(a, `?time=${encodeURIComponent(last.created_at)}&id=${last.notification_id}`);
    assert.equal(older.data.rows.length, 1);
    assert.equal((await api(b)).data.rows.length, 0);
    assert.equal((await api(b, `?time=${encodeURIComponent(last.created_at)}&id=${last.notification_id}`)).data.rows.length, 0);
    assert.equal((await api(a, `?time=${encodeURIComponent(last.created_at)}&id=${last.notification_id}`, undefined, b.id)).response.status, 403);
    assert.equal((await api(a, "", { action: "read", id: first.data.rows[0].notification_id }, b.id)).response.status, 403);
    assert.equal((await api(a, "", { action: "read", id: first.data.rows[0].notification_id })).response.status, 200);
    assert.ok((await api(a)).data.rows[0].read_at);
    assert.equal((await api(a, "", { action: "preference", category: "messages", enabled: false })).response.status, 200);
    assert.equal((await api(a)).data.preferences.find(x => x.category === "messages").enabled, false);
    assert.equal((await api(a, "", { action: "preference", category: "essential", enabled: false })).response.status, 400);
    sql(`update private.notification_feature_gate set enabled=false;`);
    assert.equal((await api(a)).response.status, 403);
    assert.equal((await api(a, "", { action: "read", id: ids[0] })).response.status, 403);
    const page = await fetch(`${origin}/notifications`, { headers: { Cookie: a.cookie() }, redirect: "manual" });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Notifications/);
  } finally {
    sql(`update private.notification_feature_gate set enabled=false;
      delete from private.notification_items where recipient_id in (${users.map(x=>`'${x.id}'`).join(",") || "null"});
      delete from private.notification_preferences where recipient_id in (${users.map(x=>`'${x.id}'`).join(",") || "null"});
      delete from auth.users where id in (${users.map(x=>`'${x.id}'`).join(",") || "null"});`);
  }
});

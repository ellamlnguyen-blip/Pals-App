import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createServerClient } = require("@supabase/ssr");
const status = JSON.parse(execFileSync(process.env.SUPABASE_CLI ?? "supabase", ["status", "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
assert.equal(process.env.WEB_TEST_ORIGIN, "http://127.0.0.1:3000");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const ids = [];
function sql(statement) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_pals-local", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: statement, encoding: "utf8" }).trim();
}
async function fixture() {
  const jar = new Map();
  const client = createServerClient(status.API_URL, key, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: values => { for (const { name, value } of values) jar.set(name, value); },
  }});
  const email = `dm-web-${crypto.randomUUID()}@unc.edu`, password = `Local-only-${crypto.randomUUID()}`;
  const created = await client.auth.signUp({ email, password });
  assert.equal(created.error, null);
  const id = created.data.user.id; ids.push(id);
  sql(`update auth.users set email_confirmed_at=now() where id='${id}'`);
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.equal(signed.error, null);
  return { id, client, cookie: () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
}
async function web(path, account, method = "GET", body) {
  const response = await fetch(`${process.env.WEB_TEST_ORIGIN}${path}`, { method,
    headers: { Cookie: account?.cookie() ?? "", "x-pals-dm-actor": account?.id ?? crypto.randomUUID(), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i, `${method} ${path} cache`);
  return { status: response.status, body: await response.json() };
}
test("local web DM routes bind original sessions and preserve request consent", async () => {
  let a, b;
  try {
    a = await fixture(); b = await fixture();
    sql(`insert into storage.objects(bucket_id,name,owner_id) select 'profile-photos',id::text||'/primary.png',id::text from public.accounts where id in ('${a.id}','${b.id}');
      update public.profiles set real_name='DM Web',major='Science',graduation_year=2028,bio='Local fixture',primary_photo_path=user_id::text||'/primary.png' where user_id in ('${a.id}','${b.id}');
      insert into private.people_preferences(account_id,opted_in) values ('${a.id}',true),('${b.id}',true);`);
    sql(`update private.people_feature_gate set enabled=true; update private.dm_feature_gate set enabled=true;`);
    assert.equal((await a.client.rpc("get_access_state")).data, "ready");
    assert.equal((await b.client.rpc("get_access_state")).data, "ready");
    assert.equal((await web("/api/dm", null)).status, 403);
    const first = { peer: b.id, key: crypto.randomUUID(), body: "Hello <script>alert(1)</script>\nSee you?" };
    assert.equal((await web("/api/dm", b, "POST", first)).status, 403, "original actor binding");
    const created = await web("/api/dm", a, "POST", first);
    assert.equal(created.body.kind, "ok", JSON.stringify(created.body));
    const repeat = await web("/api/dm", a, "POST", first);
    assert.equal(repeat.body.generation, created.body.generation, "same key/body deduplicates");
    const changed = await web("/api/dm", a, "POST", { ...first, body: "Changed" });
    assert.equal(changed.body.kind, "conflict");
    const outgoing = await web("/api/dm", a);
    assert.equal(outgoing.body.rows[0].first_body, null);
    const incoming = await web("/api/dm", b);
    assert.equal(incoming.body.rows[0].first_body, first.body);
    const waiting = await web(`/api/dm/${b.id}`, a);
    assert.equal(waiting.body.status.direction, "outgoing");
    assert.equal(waiting.body.bodyAccess, false);
    assert.deepEqual(waiting.body.messages, []);
    const request = await web(`/api/dm/${a.id}`, b);
    assert.equal(request.body.messages[0].body, first.body);
    const accepted = await web(`/api/dm/${a.id}`, b, "POST", { action: "reply", generation: created.body.generation, key: crypto.randomUUID(), body: "Yes" });
    assert.equal(accepted.body.kind, "ok", JSON.stringify(accepted.body));
    const active = await web(`/api/dm/${b.id}`, a);
    assert.deepEqual(active.body.messages.map(row => row.body), [first.body, "Yes"]);
    sql(`update private.people_preferences set opted_in=false where account_id='${b.id}'`);
    const paused = await web(`/api/dm/${b.id}`, a);
    assert.equal(paused.body.status.state, "accepted");
    assert.equal(paused.body.bodyAccess, false);
    assert.deepEqual(paused.body.messages, []);
    sql(`update private.people_preferences set opted_in=true where account_id='${b.id}'`);
    assert.equal((await web(`/api/dm/${b.id}`, a)).body.bodyAccess, true);
    sql(`update public.profiles set primary_photo_path=null where user_id='${a.id}'`);
    assert.equal((await a.client.rpc("get_access_state")).data, "onboarding");
    const unready = await web(`/api/dm/${b.id}`, a);
    assert.equal(unready.body.status.state, "accepted", "active unready participant retains pair state");
    assert.equal(unready.body.bodyAccess, false, "unready participant sees no bodies");
    const unreadyPage = await fetch(`${process.env.WEB_TEST_ORIGIN}/chats/direct/${b.id}`, {
      headers: { Cookie: a.cookie() }, redirect: "manual",
    });
    assert.equal(unreadyPage.status, 200, "unready active participant can reach management route");
    assert.match(unreadyPage.headers.get("cache-control") ?? "", /no-store/i);
    sql(`update public.profiles set primary_photo_path=user_id::text||'/primary.png' where user_id='${a.id}'`);
    const closed = await web(`/api/dm/${b.id}`, a, "POST", { action: "close", generation: created.body.generation });
    assert.equal(closed.body.kind, "ok");
    assert.equal((await web(`/api/dm/${b.id}`, a)).body.kind, "unavailable");
  } finally {
    sql(`update private.dm_feature_gate set enabled=false; update private.people_feature_gate set enabled=false;
      set dm.allow_fixture_cleanup='true';
      delete from private.dm_retries where actor_id in (${ids.map(id => `'${id}'`).join(",") || "null"});
      delete from private.dm_messages where author_id in (${ids.map(id => `'${id}'`).join(",") || "null"});
      delete from private.dm_pairs where low_id in (${ids.map(id => `'${id}'`).join(",") || "null"}) or high_id in (${ids.map(id => `'${id}'`).join(",") || "null"});
      delete from private.dm_suppression where initiator_id in (${ids.map(id => `'${id}'`).join(",") || "null"}) or recipient_id in (${ids.map(id => `'${id}'`).join(",") || "null"});
      delete from auth.users where id in (${ids.map(id => `'${id}'`).join(",") || "null"});
      set storage.allow_delete_query='true'; delete from storage.objects where owner_id in (${ids.map(id => `'${id}'`).join(",") || "null"});`);
  }
});

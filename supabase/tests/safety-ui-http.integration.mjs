import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

// Run serially against a production-mode built web server and disposable local
// Supabase. SQL prepares and clears fixtures; all app operations use real Auth.
const origin = process.env.WEB_TEST_ORIGIN;
assert.equal(origin, "http://127.0.0.1:3100");
const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(execFileSync(cli, ["status", "--output", "json"], {
  encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
}));
assert.equal(status.API_URL, "http://127.0.0.1:54321");
assert.match(status.DB_URL, /^postgresql?:\/\/postgres:[^@]*@127\.0\.0\.1:54322\/postgres$/);
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createServerClient } = require("@supabase/ssr");
const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
assert.ok(key);
const db = statement => execFileSync("docker", ["exec", "-i", "supabase_db_pals-local",
  "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
{ input: statement, encoding: "utf8" }).trim();
const quote = value => `'${value.replaceAll("'", "''")}'`;
const confirmation = "global-hangout-consequences-v1";

async function signup() {
  const jar = new Map();
  const client = createServerClient(status.API_URL, key, { cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: values => { for (const { name, value } of values) jar.set(name, value); },
  } });
  const email = `safety-ui-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const created = await client.auth.signUp({ email, password });
  assert.equal(created.error, null);
  const id = created.data.user.id;
  db(`update auth.users set email_confirmed_at=now() where id=${quote(id)}`);
  assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
  return { id, client, cookie: () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ") };
}

async function api(user, path = "", body, marker = user?.id) {
  const url = new URL(`/api/safety${path}`, origin);
  const response = await fetch(url, { method: body === undefined ? "GET" : "POST",
    headers: { Cookie: user?.cookie() ?? "", "x-pals-safety-actor": marker ?? "",
      ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const raw = await response.text();
  assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/i);
  assert.equal(response.headers.get("pragma"), "no-cache");
  return { status: response.status, data: JSON.parse(raw), raw, url: url.toString() };
}
const block = (id, blocked) => ({ action: "block", id, blocked, confirmation });
const report = (id, requestId, narrative = "  Private allegation  ", mode = "user") => ({
  action: "report", mode, id, requestId, category: "harassment", narrative,
});
function expectReceipt(result, target, narrative) {
  assert.equal(result.status, 200, result.raw);
  assert.deepEqual(Object.keys(result.data).sort(), ["actor", "kind", "receipt"]);
  assert.equal(result.data.kind, "ok");
  assert.deepEqual(Object.keys(result.data.receipt).sort(), ["receipt_id", "submitted_at"]);
  assert.match(result.data.receipt.receipt_id, /^[0-9a-f-]{36}$/);
  assert.ok(Number.isFinite(Date.parse(result.data.receipt.submitted_at)));
  assert.ok(!result.raw.includes(target));
  assert.ok(!result.raw.includes(narrative.trim()));
  assert.ok(!result.url.includes(target));
  assert.ok(!result.url.includes(narrative.trim()));
  return result.data.receipt;
}

test("built safety API binds the cookie actor, rejects stale writes and keeps report receipts private", {
  concurrency: false, timeout: 120_000,
}, async () => {
  const users = [];
  const hangouts = [];
  try {
    const anonymous = await api(null, "?view=probe");
    assert.equal(anonymous.status, 403);
    assert.deepEqual(anonymous.data, { kind: "denied" });
    users.push(await signup());
    users.push(await signup());
    const [a, b] = users;
    const ids = users.map(user => quote(user.id)).join(",");
    db(`insert into storage.objects(bucket_id,name,owner_id)
      select 'profile-photos',id::text||'/primary.png',id::text
      from public.accounts where id in (${ids});
      update public.profiles set real_name='Safety UI',major='Science',
        graduation_year=2028,bio='Local fixture',
        primary_photo_path=user_id::text||'/primary.png' where user_id in (${ids});
      insert into private.people_preferences(account_id,opted_in)
        select id,true from public.accounts where id in (${ids});
      update private.people_feature_gate set enabled=true;`);
    assert.equal((await a.client.rpc("get_access_state")).data, "ready");
    assert.equal((await b.client.rpc("get_access_state")).data, "ready");
    db("update private.safety_feature_gate set enabled=false");
    assert.equal((await api(a, "?view=probe")).status, 403, "safety gate starts off");
    db("update private.safety_feature_gate set enabled=true");
    assert.equal((await api(a, "?view=probe", undefined, b.id)).status, 403);
    assert.equal((await api(a, "?view=probe", undefined, crypto.randomUUID())).status, 403);
    assert.equal((await api(a, "?view=probe")).data.actor, a.id);
    assert.equal((await api(a, "?view=blocked", undefined, b.id)).status, 403);
    assert.equal((await api(a, "", block(b.id, true), b.id)).status, 403);
    assert.equal((await api(a, "", report(b.id, crypto.randomUUID()), b.id)).status, 403);
    assert.equal((await api(a, "", { action: "block", id: b.id, blocked: true })).status, 400,
      "pre-C body without global confirmation is stale");
    assert.equal((await api(a, "", { ...block(b.id, true), confirmation: "people-only" })).status, 400);
    assert.equal((await api(a, "", { ...block(b.id, true), id: "short" })).status, 400);
    assert.equal((await api(a, "", block(crypto.randomUUID(), true))).status, 403,
      "unknown target remains neutral");
    const blocked = await api(a, "", block(b.id, true));
    assert.equal(blocked.status, 200, blocked.raw);
    assert.deepEqual(blocked.data, { kind: "ok" });
    assert.deepEqual((await api(a, `?view=exact&id=${b.id}`)).data,
      { kind: "ok", actor: a.id, blocked: true });
    assert.deepEqual((await api(a, "?view=blocked")).data.rows, [{ account_id: b.id }]);
    assert.deepEqual((await api(b, "?view=blocked")).data.rows, [], "incoming block is private");
    assert.equal((await api(a, "", { action: "block", id: b.id, blocked: false })).status, 400,
      "stale unblock is also denied");
    assert.equal((await api(a, "", block(b.id, false))).status, 200);
    assert.equal((await api(a, `?view=exact&id=${b.id}`)).data.blocked, false);
    assert.deepEqual((await api(a, "?view=blocked")).data.rows, []);

    // A page may have rendered while People was still visible. Revocation must
    // be evaluated at submit time, with the same neutral result as an unknown ID.
    db(`update private.people_preferences set opted_in=false where account_id=${quote(b.id)}`);
    const revoked = await api(a, "", report(b.id, crypto.randomUUID()));
    const unknown = await api(a, "", report(crypto.randomUUID(), crypto.randomUUID()));
    assert.equal(revoked.status, 403);
    assert.deepEqual(revoked.data, { kind: "denied" });
    assert.deepEqual(unknown.data, revoked.data);
    db(`update private.people_preferences set opted_in=true where account_id=${quote(b.id)}`);

    const requestId = crypto.randomUUID();
    const firstInput = report(b.id, requestId);
    const first = expectReceipt(await api(a, "", firstInput), b.id, firstInput.narrative);
    const retry = expectReceipt(await api(a, "", firstInput), b.id, firstInput.narrative);
    assert.deepEqual(retry, first, "same UUID and payload recover an interrupted response");
    const normalized = expectReceipt(await api(a, "", { ...firstInput,
      narrative: firstInput.narrative.trim() }), b.id, firstInput.narrative);
    assert.deepEqual(normalized, first, "normalized exact retry keeps the receipt");
    const changed = await api(a, "", { ...firstInput, narrative: "Changed allegation" });
    assert.equal(changed.status, 403);
    assert.deepEqual(changed.data, { kind: "denied" });
    const receipts = new Set([first.receipt_id]);

    // The reporter joins a real Hangout, is removed, and then loses its public
    // row when the host cancels it. Recovery may show only the retained ID/state.
    db("update private.hangout_feature_gate set enabled=true");
    const create = await b.client.rpc("create_hangout", {
      p_request_id: crypto.randomUUID(), p_title: "Hidden retained title",
      p_starts_at: new Date(Date.now() + 3600_000).toISOString(),
      p_public_place: "Hidden retained place", p_public_latitude: 35.913,
      p_public_longitude: -79.055, p_private_instructions: "Hidden retained instructions",
    });
    assert.equal(create.error, null, create.error?.message);
    const hangoutId = create.data;
    hangouts.push(hangoutId);
    assert.equal((await a.client.rpc("join_hangout", { p_hangout_id: hangoutId })).error, null);
    assert.equal((await b.client.rpc("remove_hangout_participant", {
      p_hangout_id: hangoutId, p_account_id: a.id,
    })).error, null);
    assert.equal((await b.client.rpc("cancel_hangout", {
      p_hangout_id: hangoutId, p_expected_revision: 1,
    })).error, null);
    db(`update private.hangout_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      update private.people_preferences set opted_in=false where account_id=${quote(b.id)};
      update public.profiles set primary_photo_path=null where user_id=${quote(a.id)};`);
    assert.equal((await a.client.rpc("get_access_state")).data, "onboarding");
    const retained = await api(a, "?view=retained");
    assert.equal(retained.status, 200, retained.raw);
    assert.deepEqual(retained.data, { kind: "ok", actor: a.id,
      rows: [{ hangout_id: hangoutId, own_state: "removed" }] });
    for (const hidden of [b.id, "Hidden retained title", "Hidden retained place", "Hidden retained instructions"])
      assert.ok(!retained.raw.includes(hidden), `recovery omits ${hidden}`);
    const hiddenRow = await a.client.from("hangouts").select("id,title").eq("id", hangoutId);
    assert.deepEqual(hiddenRow.data, [], "removed reporter cannot recover cancelled source details");

    const hangoutInput = report(hangoutId, crypto.randomUUID(), "Retained plan concern", "hangout");
    receipts.add(expectReceipt(await api(a, "", hangoutInput), hangoutId,
      hangoutInput.narrative).receipt_id);
    const hostInput = report(hangoutId, crypto.randomUUID(), "Retained host concern", "hangout_host");
    const hostResult = await api(a, "", hostInput);
    receipts.add(expectReceipt(hostResult, hangoutId, hostInput.narrative).receipt_id);
    assert.ok(!hostResult.raw.includes(b.id), "host identity is never resolved to the browser");
    assert.ok(!hostResult.url.includes(b.id));
    const unauthorizedHost = await api(b, "", report(hangoutId, crypto.randomUUID(),
      "Own host concern", "hangout_host"));
    const unknownHost = await api(a, "", report(crypto.randomUUID(), crypto.randomUUID(),
      "Unknown host concern", "hangout_host"));
    assert.equal(unauthorizedHost.status, 403);
    assert.deepEqual(unauthorizedHost.data, { kind: "denied" });
    assert.deepEqual(unknownHost.data, unauthorizedHost.data,
      "unauthorized host reference reveals no identity or existence");
    assert.ok(!unauthorizedHost.raw.includes(b.id));
    assert.ok(!unknownHost.raw.includes(b.id));
    assert.deepEqual(expectReceipt(await api(a, "", hostInput), hangoutId,
      hostInput.narrative), hostResult.data.receipt, "retained host retry stays opaque");
    for (let i = 0; i < 2; i++) {
      const input = report(hangoutId, crypto.randomUUID(), `Local allegation ${i}`, "hangout");
      receipts.add(expectReceipt(await api(a, "", input), hangoutId, input.narrative).receipt_id);
    }
    assert.equal(receipts.size, 5, "new keys create five distinct reports");
    const sixth = await api(a, "", report(hangoutId, crypto.randomUUID(), "Sixth allegation", "hangout"));
    assert.equal(sixth.status, 403);
    assert.deepEqual(sixth.data, { kind: "denied" });
    assert.equal(db(`select count(*) from private.safety_reports where reporter_id=${quote(a.id)}`), "5");
    assert.deepEqual(expectReceipt(await api(a, "", firstInput), b.id, firstInput.narrative), first,
      "exact retry remains available after the fifth slot");
    db("update private.safety_feature_gate set enabled=false");
    assert.equal((await api(a, "?view=blocked")).status, 403);
    assert.equal((await api(a, "", firstInput)).status, 403);
  } finally {
    const ids = users.map(user => quote(user.id)).join(",") || "null";
    db(`update private.safety_feature_gate set enabled=false;
      update private.people_feature_gate set enabled=false;
      update private.hangout_feature_gate set enabled=false;
      delete from private.safety_report_requests where reporter_id in (${ids});
      delete from private.safety_reports where reporter_id in (${ids});
      delete from private.people_blocks where blocker_id in (${ids}) or blocked_id in (${ids});
      delete from private.notification_items where recipient_id in (${ids}) or actor_id in (${ids});
      delete from private.notification_preferences where recipient_id in (${ids});
      delete from private.hangout_peer_provenance where hangout_id in (${hangouts.map(quote).join(",") || "null"});
      delete from private.hangout_create_requests where hangout_id in (${hangouts.map(quote).join(",") || "null"});
      delete from public.hangouts where id in (${hangouts.map(quote).join(",") || "null"});
      update public.profiles set primary_photo_path=null where user_id in (${ids});
      delete from private.people_preferences where account_id in (${ids});
      set storage.allow_delete_query='true';
      delete from storage.objects where owner_id in (${ids});
      delete from auth.users where id in (${ids});`);
  }
});

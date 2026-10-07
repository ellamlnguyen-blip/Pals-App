import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

// Read-only Auth HTTP boundary probe after independent migration review.
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const runtime = "/private/tmp/pals-task028-runtime";
const env = Object.fromEntries(
  readFileSync(`${runtime}/apps/web/.env.local`, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
assert.equal(env.APP_ENV, "local");
assert.equal(env.SUPABASE_URL, "http://127.0.0.1:55421");
const key = env.SUPABASE_PUBLISHABLE_KEY;
assert.ok(key);
const maya = JSON.parse(readFileSync(`${runtime}/profile-fixture.json`, "utf8"));
const jordan = JSON.parse(readFileSync(`${runtime}/profile-peer-fixture.json`, "utf8"));
function client() {
  return createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("real Auth sessions deny default-off rich detail and raw peer profile", async () => {
  const viewer = client();
  const subject = client();
  const anonymous = client();
  assert.equal((await viewer.auth.signInWithPassword({ email: maya.email, password: maya.password })).error, null);
  assert.equal((await subject.auth.signInWithPassword({ email: jordan.email, password: jordan.password })).error, null);
  const before = await subject.rpc("get_my_rich_profile_preference");
  assert.equal(before.error, null);
  assert.deepEqual(before.data, [{ opted_in: false, revision: 0 }]);
  const subjectPeople = await subject.rpc("get_people_preference");
  const viewerPeople = await viewer.rpc("get_people_preference");
  assert.equal(subjectPeople.data, true);
  assert.equal(viewerPeople.data, true);
  const anonDetail = await anonymous.rpc("get_rich_people_detail", { p_account_id: jordan.userId });
  assert.ok(anonDetail.error, "anon cannot call rich detail");
  const forged = await viewer.rpc("get_rich_people_detail", {
    p_account_id: jordan.userId,
    p_actor_id: jordan.userId,
  });
  assert.ok(forged.error, "caller ID is not an RPC parameter");
  const raw = await viewer.from("profiles").select("hometown,prompts").eq("user_id", jordan.userId);
  assert.equal(raw.error, null);
  assert.deepEqual(raw.data, [], "peer raw profile stays owner-only");
  const detail = await viewer.rpc("get_rich_people_detail", { p_account_id: jordan.userId });
  assert.equal(detail.error, null);
  assert.deepEqual(detail.data, [], "existing People consent does not backfill rich consent");
  const self = await subject.rpc("get_rich_people_detail", { p_account_id: jordan.userId });
  assert.equal(self.error, null);
  assert.deepEqual(self.data, []);
});

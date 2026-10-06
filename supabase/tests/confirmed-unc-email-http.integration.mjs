import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

// This fixture uses only the disposable local Supabase instance.
if (process.env.APP_ENV && process.env.APP_ENV !== "local")
  throw new Error("Local integration fixture only");
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const status = JSON.parse(
  execFileSync(process.env.SUPABASE_CLI ?? "supabase", ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anonKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
function sql(statement) {
  return execFileSync("docker", ["exec", "supabase_db_pals-local", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", statement], {
    encoding: "utf8",
  }).trim();
}
function student() {
  return createClient(status.API_URL, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("confirmed UNC account uses Hangouts and chat with an empty profile", async () => {
  const email = `access-${crypto.randomUUID()}@unc.edu`;
  const password = `Local-${crypto.randomUUID()}-pass`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  const id = created.data.user.id;
  const client = student();
  try {
    sql("update private.pilot_availability set enabled=true where singleton; update private.pilot_capabilities set enabled=true where key in ('onboarding','hangouts','hangout_chat'); update private.hangout_feature_gate set enabled=true where singleton; update private.hangout_chat_feature_gate set enabled=true where singleton");
    assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
    assert.equal((await client.rpc("get_access_state")).data, "ready");
    const own = await client.from("profiles").select("real_name,primary_photo_path").eq("user_id", id).single();
    assert.equal(own.error, null);
    assert.equal(own.data.real_name, null);
    assert.equal(own.data.primary_photo_path, null);
    const createdHangout = await client.rpc("create_hangout", {
      p_request_id: crypto.randomUUID(),
      p_title: "Photo free UNC Hangout",
      p_starts_at: new Date(Date.now() + 86_400_000).toISOString(),
      p_public_place: "Campus quad",
      p_public_latitude: 35.9101,
      p_public_longitude: -79.0478,
    });
    assert.equal(createdHangout.error, null);
    const hangoutId = createdHangout.data;
    assert.equal((await client.from("hangouts").select("id").eq("id", hangoutId).single()).data?.id, hangoutId);
    assert.equal((await client.rpc("send_hangout_message", {
      p_hangout_id: hangoutId,
      p_request_id: crypto.randomUUID(),
      p_body: "See you there",
    })).error, null);
    assert.equal((await client.rpc("read_hangout_messages", { p_hangout_id: hangoutId })).data?.length, 1);
    // Auth email changes revoke access even if an old browser session remains.
    assert.equal((await admin.auth.admin.updateUserById(id, { email: `changed-${crypto.randomUUID()}@example.edu`, email_confirm: true })).error, null);
    assert.equal((await client.rpc("get_access_state")).data, "unverified");
    assert.equal((await client.from("hangouts").select("id").eq("id", hangoutId)).data?.length, 0);
  } finally {
    try {
      sql(`begin; set local chat.allow_fixture_cleanup='true';
        delete from private.hangout_message_requests where author_id='${id}';
        delete from private.hangout_messages where author_id='${id}';
        delete from private.hangout_conversations where hangout_id in
          (select id from public.hangouts where host_id='${id}');
        delete from private.hangout_create_requests where host_id='${id}';
        delete from public.hangouts where host_id='${id}'; commit`);
      assert.equal((await admin.auth.admin.deleteUser(id)).error, null);
    } finally {
      sql("update private.hangout_chat_feature_gate set enabled=false where singleton; update private.hangout_feature_gate set enabled=false where singleton; update private.pilot_capabilities set enabled=false where key in ('onboarding','hangouts','hangout_chat'); update private.pilot_availability set enabled=false where singleton");
    }
  }
});

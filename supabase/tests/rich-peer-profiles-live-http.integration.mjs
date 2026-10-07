import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

// Disposable-local only. Creates two synthetic Auth users and removes them.
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(
  readFileSync("/private/tmp/pals-task028-runtime/apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
assert.equal(env.APP_ENV, "local");
assert.equal(env.SUPABASE_URL, "http://127.0.0.1:55421");
assert.match(
  execFileSync("docker", ["port", "supabase_db_pals-task028-disposable", "5432/tcp"], { encoding: "utf8" }),
  /:55422\b/,
);
function sql(statement) {
  return execFileSync(
    "docker",
    ["exec", "supabase_db_pals-task028-disposable", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", statement],
    { encoding: "utf8" },
  ).trim();
}
function student() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function expectNoError(result, label) {
  assert.equal(result.error, null, label);
  return result.data;
}

test("real Auth rich opt-in, projection and live revocation", { timeout: 120000 }, async () => {
  const original = JSON.parse(sql(`select json_build_object(
    'availability',(select enabled from private.pilot_availability where singleton),
    'peopleCapability',(select enabled from private.pilot_capabilities where key='people'),
    'peopleGate',(select enabled from private.people_feature_gate where singleton),
    'richGate',(select enabled from private.rich_profile_feature_gate where singleton))`));
  const suffix = crypto.randomUUID();
  const password = `RichLocal-${crypto.randomUUID()}-pass`;
  const first = student();
  const second = student();
  const anonymous = student();
  const ids = [];
  try {
    for (const [client, label] of [[first, "viewer"], [second, "subject"]]) {
      const signup = await client.auth.signUp({ email: `rich-${label}-${suffix}@unc.edu`, password });
      const user = expectNoError(signup, `${label} sign-up`).user;
      assert.ok(user?.id);
      ids.push(user.id);
    }
    const [viewerId, subjectId] = ids;
    sql(`update auth.users set email_confirmed_at=now() where id in ('${viewerId}','${subjectId}');
      update public.profiles set real_name='Local Rich Test',major='Biology',graduation_year=2028,
        bio='Meet for coffee',hometown='Durham, NC',
        prompts='[{"question":"Favorite walk?","answer":"Campus loop"}]'::jsonb
        where user_id in ('${viewerId}','${subjectId}');
      insert into private.people_preferences(account_id,opted_in)
        values('${viewerId}',true),('${subjectId}',true)
        on conflict(account_id) do update set opted_in=true;
      update private.pilot_availability set enabled=true where singleton;
      update private.pilot_capabilities set enabled=true where key='people';
      update private.people_feature_gate set enabled=true where singleton;
      update private.rich_profile_feature_gate set enabled=true where singleton;`);
    expectNoError(await first.auth.signInWithPassword({ email: `rich-viewer-${suffix}@unc.edu`, password }), "viewer sign-in");
    expectNoError(await second.auth.signInWithPassword({ email: `rich-subject-${suffix}@unc.edu`, password }), "subject sign-in");
    const initial = expectNoError(await second.rpc("get_my_rich_profile_preference"), "default rich consent");
    assert.deepEqual(initial, [{ opted_in: false, revision: 0 }]);
    assert.deepEqual(expectNoError(await first.rpc("get_rich_people_detail", { p_account_id: subjectId }), "default detail"), []);
    assert.ok((await anonymous.rpc("get_rich_people_detail", { p_account_id: subjectId })).error);
    assert.ok((await first.rpc("get_rich_people_detail", { p_account_id: subjectId, p_actor_id: subjectId })).error);
    assert.deepEqual(expectNoError(await first.from("profiles").select("hometown,prompts").eq("user_id", subjectId), "raw peer RLS"), []);
    const enabled = expectNoError(await second.rpc("set_my_rich_profile_preference", {
      p_opted_in: true, p_expected_revision: 0,
    }), "rich opt-in");
    assert.deepEqual(enabled, [{ opted_in: true, revision: 1 }]);
    const detail = expectNoError(await first.rpc("get_rich_people_detail", { p_account_id: subjectId }), "rich detail");
    assert.equal(detail.length, 1);
    assert.equal(detail[0].account_id, subjectId);
    assert.equal(detail[0].hometown, "Durham, NC");
    assert.equal(detail[0].prompts[0].answer, "Campus loop");
    assert.equal(detail[0].unc_email_verified, true);
    assert.deepEqual(detail[0].photo_slots, []);
    assert.ok(!Object.hasOwn(detail[0], "primary_photo_path"));
    assert.deepEqual(expectNoError(await second.rpc("get_rich_people_detail", { p_account_id: subjectId }), "self detail"), []);
    assert.ok((await second.rpc("set_my_rich_profile_preference", { p_opted_in: false, p_expected_revision: 0 })).error);
    assert.deepEqual(expectNoError(await second.rpc("set_my_rich_profile_preference", {
      p_opted_in: true, p_expected_revision: 1,
    }), "rich no-op"), [{ opted_in: true, revision: 1 }]);
    sql(`update private.rich_profile_feature_gate set enabled=false where singleton`);
    assert.deepEqual(expectNoError(await first.rpc("get_rich_people_detail", { p_account_id: subjectId }), "gate-revoked detail"), []);
    assert.deepEqual(expectNoError(await second.rpc("set_my_rich_profile_preference", {
      p_opted_in: false, p_expected_revision: 1,
    }), "gate-off opt-out"), [{ opted_in: false, revision: 2 }]);
    sql(`update private.rich_profile_feature_gate set enabled=true where singleton`);
    assert.deepEqual(expectNoError(await first.rpc("get_rich_people_detail", { p_account_id: subjectId }), "opted-out detail"), []);
    expectNoError(await second.rpc("set_my_rich_profile_preference", { p_opted_in: true, p_expected_revision: 2 }), "fresh opt-in");
    sql(`update auth.users set email_confirmed_at=null where id='${subjectId}'`);
    assert.deepEqual(expectNoError(await first.rpc("get_rich_people_detail", { p_account_id: subjectId }), "Auth-revoked detail"), []);
    assert.deepEqual(expectNoError(await second.rpc("set_my_rich_profile_preference", {
      p_opted_in: false, p_expected_revision: 3,
    }), "unconfirmed opt-out"), [{ opted_in: false, revision: 4 }]);
  } finally {
    // Restore exact prior policy values and remove only this test's Auth users.
    sql(`begin;
      update private.rich_profile_feature_gate set enabled=${original.richGate} where singleton;
      update private.people_feature_gate set enabled=${original.peopleGate} where singleton;
      update private.pilot_capabilities set enabled=${original.peopleCapability} where key='people';
      update private.pilot_availability set enabled=${original.availability} where singleton;
      ${ids.length ? `delete from auth.users where id in (${ids.map((id) => `'${id}'`).join(",")});` : ""}
      commit;`);
  }
});

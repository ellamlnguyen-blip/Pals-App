import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { readRichPeerPhoto, readBoundedPhotoStream } from "../../apps/web/lib/rich-peer-photo-core.ts";
import { privatePeerPhotoUrl } from "../../apps/web/lib/rich-peer-photo-path.ts";
import { sanitizePeerPhoto } from "../../apps/web/lib/rich-peer-photo-image.ts";

// Exact disposable local stack and dedicated fourth subject only. This file
// intentionally reads secrets into memory without logging them.
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");
const { createServerClient } = require("@supabase/ssr");
const sharp = require("sharp");
const runtime = process.env.PALS_PHOTO_RUNTIME_URL ?? "http://127.0.0.1:3032";
const env = Object.fromEntries(
  readFileSync("/private/tmp/pals-task028-rich-local.env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at), line.slice(at + 1).replace(/^['"]|['"]$/g, "")];
    }),
);
assert.equal(env.APP_ENV, "local");
assert.equal(env.SUPABASE_URL, "http://127.0.0.1:55421");
assert.match(runtime, /^http:\/\/(127\.0\.0\.1|localhost):3032$/);
assert.ok(env.SUPABASE_PUBLISHABLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY);
const port = execFileSync("docker", ["inspect", "--format", "{{(index (index .NetworkSettings.Ports \"5432/tcp\") 0).HostPort}}", "supabase_db_pals-task028-disposable"], { encoding: "utf8" }).trim();
assert.equal(port, "55422");
const action = JSON.parse(readFileSync("/private/tmp/pals-task028-profile-corrections-runtime/action-fixture.json", "utf8"));
const jordan = JSON.parse(readFileSync("/private/tmp/pals-task028-runtime/profile-peer-fixture.json", "utf8"));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
assert.ok(uuid.test(action.userId) && uuid.test(jordan.userId));
assert.notEqual(action.userId, jordan.userId);

function sql(statement) {
  return execFileSync("docker", ["exec", "supabase_db_pals-task028-disposable", "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" }).trim();
}
function student() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function service() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function success(result, label) {
  assert.ok(!result.error, label);
  return result.data;
}
async function cookieSession(fixture) {
  const jar = new Map();
  const client = createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { path: "/", sameSite: "lax", secure: false, httpOnly: true },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) => values.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  success(await client.auth.signInWithPassword({ email: fixture.email, password: fixture.password }), "cookie Auth sign-in");
  assert.ok(jar.size > 0, "cookie Auth session stored");
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}
function photoUrl(slot, revision, subject = action.userId) {
  return `${runtime}/people/${subject}/photo?slot=${slot}&revision=${revision}`;
}
async function request(url, cookie, method = "GET", extraHeaders = {}) {
  return fetch(url, {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
}
async function check(response, status, forbiddenPath = "") {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("content-security-policy"), "default-src 'none'");
  assert.equal(response.headers.get("etag"), null);
  assert.equal(response.headers.get("last-modified"), null);
  assert.equal(response.headers.get("location"), null);
  if (status === 200) {
    assert.equal(response.headers.get("content-type"), "image/webp");
    const bytes = Buffer.from(await response.arrayBuffer());
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "webp");
    assert.ok(meta.width <= 2048 && meta.height <= 2048);
    assert.equal(meta.exif, undefined);
    assert.equal(meta.icc, undefined);
    return bytes;
  }
  const body = await response.text();
  if (forbiddenPath) assert.ok(!body.includes(forbiddenPath), "private path absent from error");
  assert.ok(!body.includes(env.SUPABASE_SERVICE_ROLE_KEY), "service key absent from error");
  return null;
}
async function getRevision(owner) {
  return success(await owner.from("profiles").select("revision").eq("user_id", action.userId).single(), "owner revision").revision;
}
async function updateProfile(owner, changes) {
  const revision = await getRevision(owner);
  const result = await owner.from("profiles").update(changes).eq("user_id", action.userId).eq("revision", revision).select("revision").maybeSingle();
  return success(result, "owner profile CAS").revision;
}

test("real cookie photo gateway and two-check Storage races", { timeout: 180000 }, async () => {
  const original = JSON.parse(sql(`select json_build_object(
    'availability',(select enabled from private.pilot_availability where singleton),
    'onboarding',(select enabled from private.pilot_capabilities where key='onboarding'),
    'peopleCapability',(select enabled from private.pilot_capabilities where key='people'),
    'peopleGate',(select enabled from private.people_feature_gate where singleton),
    'richGate',(select enabled from private.rich_profile_feature_gate where singleton),
    'people',(select row_to_json(p) from private.people_preferences p where account_id='${action.userId}'),
    'rich',(select row_to_json(r) from private.rich_profile_preferences r where account_id='${action.userId}'),
    'profile',(select row_to_json(p) from public.profiles p where user_id='${action.userId}'),
    'confirmed',(select email_confirmed_at from auth.users where id='${action.userId}'),
    'status',(select status from public.accounts where id='${action.userId}'),
    'membership',(select university_id from public.university_memberships where user_id='${action.userId}'),
    'blocks',(select count(*) from private.people_blocks where
      (blocker_id='${action.userId}' and blocked_id='${jordan.userId}') or
      (blocker_id='${jordan.userId}' and blocked_id='${action.userId}')))`));
  assert.equal(original.richGate, false, "rich gate begins off");
  assert.equal(original.rich, null, "dedicated subject begins rich private");
  assert.equal(original.blocks, 0, "no prior fixture block");
  assert.equal(original.status, "active");
  assert.ok(original.confirmed && original.membership, "dedicated subject has confirmed campus evidence");
  const owner = student();
  const viewer = student();
  const admin = service();
  const createdPaths = [];
  let otherCampus = null;
  let staged = false;
  let ownerCookie = "";
  let viewerCookie = "";
  const old = original.profile;
  try {
    success(await owner.auth.signInWithPassword({ email: action.email, password: action.password }), "owner Auth");
    success(await viewer.auth.signInWithPassword({ email: jordan.email, password: jordan.password }), "viewer Auth");
    ownerCookie = await cookieSession(action);
    viewerCookie = await cookieSession(jordan);
    sql(`begin;
      update private.pilot_availability set enabled=true where singleton;
      update private.pilot_capabilities set enabled=true where key in ('onboarding','people');
      update private.people_feature_gate set enabled=true where singleton;
      update private.rich_profile_feature_gate set enabled=true where singleton;
      commit;`);
    for (let i = 0; i < 5; i++) {
      const path = `${action.userId}/${crypto.randomUUID()}.png`;
      const bytes = await sharp({ create: { width: 32 + i, height: 24 + i, channels: 3, background: ["red", "blue", "green", "yellow", "purple"][i] } }).png().toBuffer();
      success(await owner.storage.from("profile-photos").upload(path, bytes, { contentType: "image/png", upsert: false }), "owner photo upload");
      createdPaths.push(path);
    }
    let revision = await updateProfile(owner, {
      real_name: old.real_name ?? "Photo Fixture",
      graduation_year: old.graduation_year ?? 2028,
      major: old.major ?? "Biology",
      bio: old.bio ?? "Local photo test",
      primary_photo_path: createdPaths[0],
      additional_photo_paths: createdPaths.slice(1),
    });
    staged = true;
    success(await owner.rpc("set_people_preference", { p_opted_in: true }), "subject People opt-in");
    const pref = success(await owner.rpc("get_my_rich_profile_preference"), "rich default")[0];
    assert.equal(pref.opted_in, false);
    success(await owner.rpc("set_my_rich_profile_preference", { p_opted_in: true, p_expected_revision: pref.revision }), "subject rich opt-in");

    // Real PostgREST grant boundary and owner-only raw Storage.
    assert.ok((await student().rpc("resolve_rich_peer_photo_for_gateway", { actor_id: jordan.userId, subject_id: action.userId, slot: "primary", expected_revision: revision })).error);
    assert.ok((await viewer.rpc("resolve_rich_peer_photo_for_gateway", { actor_id: jordan.userId, subject_id: action.userId, slot: "primary", expected_revision: revision })).error);
    const resolved = success(await admin.rpc("resolve_rich_peer_photo_for_gateway", { actor_id: jordan.userId, subject_id: action.userId, slot: "primary", expected_revision: revision }), "service exact resolver");
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].object_path, createdPaths[0]);
    assert.ok((await viewer.storage.from("profile-photos").download(createdPaths[0])).error, "raw peer Storage denied");
    assert.ok((await viewer.storage.from("profile-photos").createSignedUrl(createdPaths[0], 60)).error, "peer signed URL denied");

    const parallelPhotos = await Promise.all(
      ["primary", "0", "1", "2", "3"].map((slot) =>
        request(photoUrl(slot, revision), viewerCookie),
      ),
    );
    for (const response of parallelPhotos) await check(response, 200);
    await check(await request(photoUrl("primary", revision), ""), 404, createdPaths[0]);
    await check(await request(photoUrl("primary", revision), "", "GET", { "x-actor-id": jordan.userId }), 404, createdPaths[0]);
    await check(await request(photoUrl("primary", revision), ownerCookie), 404, createdPaths[0]);
    await check(await request(photoUrl("primary", revision, crypto.randomUUID()), viewerCookie), 404);
    await check(await request(photoUrl("primary", revision), viewerCookie, "GET", { "x-actor-id": action.userId }), 200);
    for (const bad of [
      `${runtime}/people/${action.userId}/photo?slot=primary&revision=0`,
      `${runtime}/people/${action.userId}/photo?slot=5&revision=${revision}`,
      `${runtime}/people/${action.userId}/photo?slot=primary&slot=0&revision=${revision}`,
      `${runtime}/people/${action.userId}/photo?slot=primary&revision=${revision}&path=other`,
      `${runtime}/people/${action.userId}/photo?slot=primary&revision=${revision}&actor_id=${action.userId}`,
    ]) await check(await request(bad, viewerCookie), 400);
    for (const method of ["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
      await check(await request(photoUrl("primary", revision), viewerCookie, method), 405);
    await check(await request(photoUrl("primary", revision + 1), viewerCookie), 404);

    // Every current predicate is rechecked on the next HTTP request.
    for (const [off, on] of [
      ["update private.rich_profile_feature_gate set enabled=false where singleton", "update private.rich_profile_feature_gate set enabled=true where singleton"],
      ["update private.people_feature_gate set enabled=false where singleton", "update private.people_feature_gate set enabled=true where singleton"],
      ["update private.pilot_capabilities set enabled=false where key='people'", "update private.pilot_capabilities set enabled=true where key='people'"],
      ["update private.pilot_availability set enabled=false where singleton", "update private.pilot_availability set enabled=true where singleton"],
    ]) {
      sql(off);
      try { await check(await request(photoUrl("primary", revision), viewerCookie), 404); }
      finally { sql(on); }
    }
    for (const [blocker, blocked] of [[action.userId, jordan.userId], [jordan.userId, action.userId]]) {
      sql(`insert into private.people_blocks(blocker_id,blocked_id) values('${blocker}','${blocked}')`);
      try { await check(await request(photoUrl("primary", revision), viewerCookie), 404); }
      finally { sql(`delete from private.people_blocks where blocker_id='${blocker}' and blocked_id='${blocked}'`); }
    }
    sql(`update public.accounts set status='suspended' where id='${action.userId}'`);
    try { await check(await request(photoUrl("primary", revision), viewerCookie), 404); }
    finally { sql(`update public.accounts set status='active' where id='${action.userId}'`); }
    sql(`update auth.users set email_confirmed_at=null where id='${action.userId}'`);
    try { await check(await request(photoUrl("primary", revision), viewerCookie), 404); }
    finally { sql(`update auth.users set email_confirmed_at='${original.confirmed}' where id='${action.userId}'`); }
    otherCampus = crypto.randomUUID();
    sql(`insert into public.universities(id,slug,name,active,allowed_email_domains)
      values('${otherCampus}','photo-gateway-fixture-${otherCampus}','Temporary Photo Campus',true,array['unc.edu']);
      update public.university_memberships set university_id='${otherCampus}' where user_id='${action.userId}'`);
    try { await check(await request(photoUrl("primary", revision), viewerCookie), 404); }
    finally {
      sql(`update public.university_memberships set university_id='${original.membership}' where user_id='${action.userId}';
        delete from public.universities where id='${otherCampus}'`);
      otherCampus = null;
    }
    const currentPref = success(await owner.rpc("get_my_rich_profile_preference"), "rich current")[0];
    success(await owner.rpc("set_my_rich_profile_preference", { p_opted_in: false, p_expected_revision: currentPref.revision }), "rich opt-out");
    await check(await request(photoUrl("primary", revision), viewerCookie), 404);
    success(await owner.rpc("set_my_rich_profile_preference", { p_opted_in: true, p_expected_revision: currentPref.revision + 1 }), "rich re-opt-in");
    success(await owner.rpc("set_people_preference", { p_opted_in: false }), "People opt-out");
    await check(await request(photoUrl("primary", revision), viewerCookie), 404);
    success(await owner.rpc("set_people_preference", { p_opted_in: true }), "People re-opt-in");
    const afterPeople = success(await owner.rpc("get_my_rich_profile_preference"), "rich after People off")[0];
    success(await owner.rpc("set_my_rich_profile_preference", { p_opted_in: true, p_expected_revision: afterPeople.revision }), "rich re-opt-in after People");

    // A current revision with unpublishable text still denies.
    revision = await updateProfile(owner, { bio: null });
    await check(await request(photoUrl("primary", revision), viewerCookie), 404);
    revision = await updateProfile(owner, { bio: old.bio ?? "Local photo test" });
    await check(await request(photoUrl("primary", revision), viewerCookie), 200);

    // The slot index must still be selected at the current revision.
    const beforeRemoval = revision;
    revision = await updateProfile(owner, { additional_photo_paths: createdPaths.slice(1, 4) });
    await check(await request(photoUrl("3", revision), viewerCookie), 404);
    await check(await request(photoUrl("primary", revision), viewerCookie), 200);
    revision = await updateProfile(owner, { additional_photo_paths: createdPaths.slice(1) });
    await check(await request(photoUrl("3", beforeRemoval), viewerCookie), 404);
    await check(await request(photoUrl("3", revision), viewerCookie), 200);

    // Production two-check core with real resolver/Storage. Pauses are in the
    // test adapter, never in the route or its service helper.
    const resolver = async (actor, subject, slot, expectedRevision, signal) => {
      const result = await admin.rpc("resolve_rich_peer_photo_for_gateway", { actor_id: actor, subject_id: subject, slot, expected_revision: expectedRevision }).abortSignal(signal);
      return success(result, "real resolver")[0] ?? null;
    };
    const storageFetch = async (subject, path, signal) => {
      const url = privatePeerPhotoUrl(env.SUPABASE_URL, subject, path);
      assert.ok(url, "canonical private object URL");
      const response = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, cache: "no-store", redirect: "manual", signal });
      if (response.status === 404) return null;
      assert.equal(response.status, 200);
      return readBoundedPhotoStream(response.body);
    };
    const barrier = () => {
      let reached;
      let release;
      return { reached: new Promise((resolve) => { reached = resolve; }), wait: new Promise((resolve) => { release = resolve; }), hit: () => reached(), release: () => release() };
    };
    let pause = barrier();
    const blockedByRichOff = readRichPeerPhoto(jordan.userId, action.userId, "primary", revision, AbortSignal.timeout(15000), {
      resolve: resolver,
      download: async (subject, path, signal) => { const bytes = await storageFetch(subject, path, signal); pause.hit(); await pause.wait; return bytes; },
      sanitize: sanitizePeerPhoto,
    });
    await pause.reached;
    const beforeOff = success(await owner.rpc("get_my_rich_profile_preference"), "rich before race")[0];
    success(await owner.rpc("set_my_rich_profile_preference", { p_opted_in: false, p_expected_revision: beforeOff.revision }), "rich off during download");
    pause.release();
    assert.equal(await blockedByRichOff, null, "rich off during fetch discards bytes");
    success(await owner.rpc("set_my_rich_profile_preference", { p_opted_in: true, p_expected_revision: beforeOff.revision + 1 }), "rich on after race");

    pause = barrier();
    const oldPath = createdPaths[0];
    const reuse = readRichPeerPhoto(jordan.userId, action.userId, "primary", revision, AbortSignal.timeout(15000), {
      resolve: resolver,
      download: async (subject, path, signal) => { const bytes = await storageFetch(subject, path, signal); pause.hit(); await pause.wait; return bytes; },
      sanitize: sanitizePeerPhoto,
    });
    await pause.reached;
    await updateProfile(owner, { primary_photo_path: null });
    success(await owner.storage.from("profile-photos").remove([oldPath]), "delete detached photo");
    const replacement = await sharp({ create: { width: 64, height: 48, channels: 3, background: "black" } }).png().toBuffer();
    success(await owner.storage.from("profile-photos").upload(oldPath, replacement, { contentType: "image/png", upsert: false }), "reuse deleted name");
    revision = await updateProfile(owner, { primary_photo_path: oldPath });
    pause.release();
    assert.equal(await reuse, null, "name reuse during fetch discards old bytes");
    await check(await request(photoUrl("primary", revision), viewerCookie), 200);
  } finally {
    // Restore exact fixture data and every policy value, even after an
    // assertion failure. The profile CAS may advance revision, by design.
    try {
      if (staged) {
        await updateProfile(owner, {
          real_name: old.real_name, graduation_year: old.graduation_year,
          major: old.major, bio: old.bio,
          primary_photo_path: old.primary_photo_path,
          additional_photo_paths: old.additional_photo_paths,
        });
      }
      for (const path of createdPaths)
        success(await owner.storage.from("profile-photos").remove([path]), "cleanup test photo");
    } finally {
      let campusRestoreError;
      if (otherCampus) {
        try {
          sql(`update public.university_memberships set university_id='${original.membership}' where user_id='${action.userId}';
            delete from public.universities where id='${otherCampus}'`);
        } catch (error) {
          campusRestoreError = error;
        }
      }
      const restorePeople = original.people
        ? `insert into private.people_preferences(account_id,opted_in) values('${action.userId}',${original.people.opted_in}) on conflict(account_id) do update set opted_in=excluded.opted_in;`
        : `delete from private.people_preferences where account_id='${action.userId}';`;
      const restoreRich = original.rich
        ? `insert into private.rich_profile_preferences(account_id,opted_in,revision) values('${action.userId}',${original.rich.opted_in},${original.rich.revision}) on conflict(account_id) do update set opted_in=excluded.opted_in,revision=excluded.revision;`
        : `delete from private.rich_profile_preferences where account_id='${action.userId}';`;
      sql(`begin;
        update private.rich_profile_feature_gate set enabled=${original.richGate} where singleton;
        update private.people_feature_gate set enabled=${original.peopleGate} where singleton;
        update private.pilot_capabilities set enabled=${original.peopleCapability} where key='people';
        update private.pilot_capabilities set enabled=${original.onboarding} where key='onboarding';
        update private.pilot_availability set enabled=${original.availability} where singleton;
        delete from private.people_blocks where
          (blocker_id='${action.userId}' and blocked_id='${jordan.userId}') or
          (blocker_id='${jordan.userId}' and blocked_id='${action.userId}');
        ${restorePeople} ${restoreRich}
        update public.accounts set status='${original.status}' where id='${action.userId}';
        update auth.users set email_confirmed_at='${original.confirmed}' where id='${action.userId}';
        commit;`);
      if (campusRestoreError) throw campusRestoreError;
    }
  }
  const after = JSON.parse(sql(`select json_build_object(
    'richGate',(select enabled from private.rich_profile_feature_gate where singleton),
    'people',(select row_to_json(p) from private.people_preferences p where account_id='${action.userId}'),
    'rich',(select row_to_json(r) from private.rich_profile_preferences r where account_id='${action.userId}'),
    'profile',(select row_to_json(p) from public.profiles p where user_id='${action.userId}'))`));
  assert.equal(after.richGate, original.richGate);
  assert.deepEqual(after.people, original.people);
  assert.deepEqual(after.rich, original.rich);
  assert.equal(after.profile.primary_photo_path, old.primary_photo_path);
  assert.deepEqual(after.profile.additional_photo_paths, old.additional_photo_paths);
});

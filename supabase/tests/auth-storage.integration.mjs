import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import { profileChecks } from "./profile-http-checks.mjs";
import { actionChecks } from "./profile-action-checks.mjs";
import { hangoutHttpChecks } from "./hangout-http-checks.mjs";
import { hangoutActionChecks } from "./hangout-action-checks.mjs";
import { peopleHttpChecks } from "./people-http-checks.mjs";

// Deliberately local only. Never accept a hosted URL or privileged key.
if (process.env.APP_ENV && process.env.APP_ENV !== "local")
  throw new Error("Integration fixtures are local only");
const require = createRequire(
  new URL("../../apps/web/package.json", import.meta.url),
);
const { createServerClient } = require("@supabase/ssr");
const cli = process.env.SUPABASE_CLI ?? "supabase";
const status = JSON.parse(
  execFileSync(cli, ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
assert.equal(status.API_URL, "http://127.0.0.1:54321");
const url = status.API_URL,
  key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=",
  "base64",
);
const ids = [];
async function assertGate(response, path) {
  if (response.headers.get("location"))
    assert.equal(response.headers.get("location"), path);
  else {
    const html = await response.text();
    assert.ok(
      html.includes(`url=${path}`),
      `streamed response redirects to ${path}`,
    );
    assert.ok(
      !html.includes("These are development examples"),
      "protected page content withheld",
    );
  }
}
function sql(statement) {
  return execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_pals-local",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-Atc",
      statement,
    ],
    { encoding: "utf8" },
  );
}
function client() {
  const jar = new Map();
  const auth = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (values) => {
        for (const { name, value } of values) jar.set(name, value);
      },
    },
  });
  return {
    auth,
    jar,
    header: () => [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
  };
}
async function emailLink(email) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const messages = await (
      await fetch("http://127.0.0.1:54324/api/v1/messages")
    ).json();
    const message = messages.messages?.find((m) =>
      m.To?.some((to) => to.Address === email),
    );
    if (message) {
      const body = await (
        await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)
      ).json();
      const link = (body.Text ?? body.HTML)
        .match(/https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]+/)?.[0]
        ?.replaceAll("&amp;", "&");
      assert.ok(link, "confirmation email has Auth verification URL");
      return link;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Local confirmation email not received");
}
async function signup(instance, suffix) {
  const email = `task003-${crypto.randomUUID()}-${suffix}@live.unc.edu`;
  const password = `Local-only-${crypto.randomUUID()}`;
  const { data, error } = await instance.auth.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "http://127.0.0.1:3000/auth/callback",
      data: { role: "admin", verified: true },
    },
  });
  assert.equal(error, null, error?.message);
  ids.push(data.user.id);
  assert.equal(data.session, null, "confirmation required before session");
  assert.ok(
    (await instance.auth.auth.signInWithPassword({ email, password })).error,
    "unconfirmed signin denied",
  );
  const link = await emailLink(email);
  const verified = await fetch(link, { redirect: "manual" });
  const callback = new URL(verified.headers.get("location"));
  assert.equal(callback.pathname, "/auth/callback");
  assert.ok(callback.searchParams.get("code"));
  return { email, password, id: data.user.id, callback };
}
test("real confirmation, SSR callback, RLS and private photo ownership", async () => {
  const owner = client(),
    peer = client();
  try {
    const a = await signup(owner, "owner");
    if (process.env.WEB_TEST_ORIGIN) {
      assert.equal(process.env.WEB_TEST_ORIGIN, "http://127.0.0.1:3000");
      const response = await fetch(a.callback, {
        headers: { Cookie: owner.header() },
        redirect: "manual",
      });
      assert.equal(response.status, 307);
      assert.equal(
        new URL(response.headers.get("location")).pathname,
        "/continue",
      );
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(";")[0],
          at = pair.indexOf("=");
        owner.jar.set(pair.slice(0, at), pair.slice(at + 1));
        assert.match(cookie, /httponly/i);
      }
      const blocked = await fetch("http://127.0.0.1:3000/hangouts", {
        headers: { Cookie: owner.header() },
        redirect: "manual",
      });
      await assertGate(blocked, "/onboarding");
      const anon = await fetch("http://127.0.0.1:3000/hangouts", {
        redirect: "manual",
      });
      await assertGate(anon, "/signin");
      const invalid = await fetch(
        "http://127.0.0.1:3000/auth/callback?code=invalid&next=https://evil.test",
        { redirect: "manual" },
      );
      assert.equal(
        new URL(invalid.headers.get("location")).pathname,
        "/verify",
      );
      // Reload the SSR client from the real callback's cookies.
      owner.auth = createServerClient(url, key, {
        cookies: {
          getAll: () =>
            [...owner.jar].map(([name, value]) => ({ name, value })),
          setAll: (values) => {
            for (const { name, value } of values) owner.jar.set(name, value);
          },
        },
      });
    } else {
      const flowId = a.callback.searchParams.get("sb_flow_id");
      assert.equal(
        (
          await owner.auth.auth.exchangeCodeForSession(
            a.callback.searchParams.get("code"),
            flowId ? { flowId } : undefined,
          )
        ).error,
        null,
      );
    }
    assert.equal((await owner.auth.rpc("get_access_state")).data, "onboarding");
    assert.equal(
      (await owner.auth.from("platform_roles").select()).data.length,
      0,
    );
    assert.ok(
      (
        await owner.auth
          .from("accounts")
          .update({ status: "active" })
          .eq("id", a.id)
      ).error,
    );
    const b = await signup(peer, "peer"),
      flowId = b.callback.searchParams.get("sb_flow_id");
    assert.equal(
      (
        await peer.auth.auth.exchangeCodeForSession(
          b.callback.searchParams.get("code"),
          flowId ? { flowId } : undefined,
        )
      ).error,
      null,
    );
    let path = `${a.id}/${crypto.randomUUID()}.png`;
    assert.equal(
      (
        await owner.auth.storage
          .from("profile-photos")
          .upload(path, png, { contentType: "image/png" })
      ).error,
      null,
    );
    assert.equal(
      sql(
        `select owner_id from storage.objects where bucket_id='profile-photos' and name='${path}'`,
      ).trim(),
      a.id,
      "Storage API assigns user ownership",
    );
    assert.ok(
      (await peer.auth.storage.from("profile-photos").download(path)).error,
      "peer download denied",
    );
    assert.ok(
      (
        await peer.auth.storage
          .from("profile-photos")
          .upload(path, png, { contentType: "image/png", upsert: true })
      ).error,
      "peer overwrite denied",
    );
    await peer.auth.storage.from("profile-photos").remove([path]);
    assert.equal(
      (await owner.auth.storage.from("profile-photos").download(path)).error,
      null,
      "peer delete did not remove photo",
    );
    assert.ok(
      (
        await peer.auth
          .from("profiles")
          .update({ primary_photo_path: path })
          .eq("user_id", b.id)
      ).error,
      "peer cannot claim object",
    );
    assert.equal(
      (
        await owner.auth
          .from("profiles")
          .update({
            real_name: "Local Test Student",
            major: "Biology",
            graduation_year: 2028,
            bio: "Local fixture",
            primary_photo_path: path,
          })
          .eq("user_id", a.id)
      ).error,
      null,
    );
    assert.equal((await owner.auth.rpc("get_access_state")).data, "ready");
    await owner.auth.storage.from("profile-photos").remove([path]);
    assert.equal(
      (await owner.auth.storage.from("profile-photos").download(path)).error,
      null,
      "active primary photo cannot be deleted",
    );
    if (process.env.WEB_TEST_ORIGIN) {
      const mapResponse = await fetch("http://127.0.0.1:3000/hangouts", {
        headers: { Cookie: owner.header() },
        redirect: "manual",
      });
      assert.equal(mapResponse.status, 200);
      const mapHtml = await mapResponse.text();
      assert.ok(mapHtml.includes("Hangouts around UNC"));
      assert.ok(mapHtml.includes("These are development examples"));
      assert.equal(
        (
          await fetch("http://127.0.0.1:3000/profile/photo", {
            headers: { Cookie: owner.header() },
          })
        ).status,
        200,
      );
    }
    await hangoutHttpChecks(owner, peer, a, b, sql, png, url, key);
    await peopleHttpChecks(owner, peer, a, b, sql, png, url, key);
    await hangoutActionChecks(owner, peer, a, b, png, sql);
    await profileChecks(owner, peer, a, sql, png);
    path = (await actionChecks(owner, a, png)) ?? path;
    sql(`update public.accounts set status='suspended' where id='${a.id}'`);
    assert.equal((await owner.auth.rpc("get_access_state")).data, "restricted");
    assert.ok(
      (await owner.auth.storage.from("profile-photos").download(path)).error,
      "stale session loses photo access after suspension",
    );
    if (process.env.WEB_TEST_ORIGIN) {
      await assertGate(
        await fetch("http://127.0.0.1:3000/hangouts", {
          headers: { Cookie: owner.header() },
          redirect: "manual",
        }),
        "/restricted",
      );
      assert.equal(
        (
          await fetch("http://127.0.0.1:3000/profile/photo", {
            headers: { Cookie: owner.header() },
          })
        ).status,
        403,
      );
    }
    sql(`update public.accounts set status='active' where id='${a.id}'`);
    assert.equal(
      (
        await owner.auth
          .from("profiles")
          .update({ primary_photo_path: null })
          .eq("user_id", a.id)
      ).error,
      null,
    );
    assert.equal(
      (await owner.auth.storage.from("profile-photos").remove([path])).error,
      null,
    );
    assert.equal((await owner.auth.auth.signOut()).error, null);
    assert.equal((await owner.auth.auth.getUser()).data.user, null);
  } finally {
    for (const id of ids) {
      assert.match(id, /^[a-f0-9-]{36}$/);
      sql(
        `delete from auth.users where id='${id}' and email like 'task003-%@live.unc.edu'`,
      );
    }
  }
});

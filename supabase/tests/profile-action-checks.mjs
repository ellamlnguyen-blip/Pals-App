import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
export async function actionChecks(owner, a, png) {
  if (!process.env.WEB_TEST_ORIGIN) return;
  const origin = process.env.WEB_TEST_ORIGIN;
  const read = async () => {
    const { data, error } = await owner.auth
      .from("profiles")
      .select("*")
      .eq("user_id", a.id)
      .single();
    assert.equal(error, null);
    return data;
  };
  await fetch(`${origin}/profile`, { headers: { Cookie: owner.header() } });
  async function action(name, values = {}, cookie = owner.header()) {
    const manifest = JSON.parse(
      readFileSync(
        new URL(
          "../../apps/web/.next/dev/server/server-reference-manifest.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const id = Object.entries(manifest.node).find(
      ([, entry]) => entry.exportedName === name,
    )?.[0];
    assert.ok(id, `${name} registered`);
    const form = new FormData();
    for (const [key, value] of Object.entries(values))
      form.set(`_1_${key}`, value);
    form.set("0", name === "cleanupPhotos" ? "[]" : '["$K1"]');
    const response = await fetch(`${origin}/profile`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin, "Next-Action": id },
      body: form,
      redirect: "manual",
    });
    const body = await response.text();
    const line = body
      .split("\n")
      .find((v) => /^[a-f0-9]+:\{"(success|error)"/.test(v));
    return {
      response,
      body,
      result: line ? JSON.parse(line.slice(line.indexOf(":") + 1)) : null,
    };
  }
  let profile = await read();
  const details = {
    revision: String(profile.revision),
    real_name: "Action Test Student",
    graduation_year: "2029",
    major: "Physics",
    bio: "Action roundtrip",
    interests: "Walking\nMusic",
    instagram: "@local.action",
  };
  let saved = await action("saveProfile", details);
  assert.equal(saved.result?.success, "Profile saved.");
  assert.deepEqual((await read()).interests, ["Walking", "Music"]);
  assert.equal((await read()).instagram, "local.action");
  const stale = await action("saveProfile", {
    ...details,
    bio: "Stale overwrite",
  });
  assert.match(stale.result.error, /another window/);
  assert.equal((await read()).bio, "Action roundtrip");
  profile = await read();
  const bad = await action("saveProfile", {
    ...details,
    revision: String(profile.revision),
    interests: "duplicate\nduplicate",
  });
  assert.ok(bad.result.error);
  assert.equal((await read()).revision, profile.revision);
  const anon = await action(
    "saveProfile",
    { ...details, revision: String(profile.revision) },
    "",
  );
  assert.ok(
    anon.response.headers.get("x-action-redirect")?.includes("/signin") ||
      anon.body.includes("/signin"),
  );
  assert.equal((await read()).revision, profile.revision);
  const photo = () => new File([png], "fixture.png", { type: "image/png" });
  // Real server action, upload then replacement then detach/cleanup.
  let added = await action("changePhoto", {
    revision: String(profile.revision),
    slot: "new",
    operation: "add",
    photo: photo(),
  });
  assert.equal(added.result?.success, "Photos saved.");
  profile = await read();
  const extra = profile.additional_photo_paths.at(-1);
  const index = profile.additional_photo_paths.length - 1;
  const replaced = await action("changePhoto", {
    revision: String(profile.revision),
    slot: String(index),
    operation: "replace",
    photo: photo(),
  });
  assert.equal(replaced.result?.success, "Photos saved.");
  assert.ok(
    (await owner.auth.storage.from("profile-photos").download(extra)).error,
    "old extra cleaned",
  );
  profile = await read();
  const removed = await action("changePhoto", {
    revision: String(profile.revision),
    slot: String(index),
    operation: "remove",
  });
  assert.equal(removed.result?.success, "Photos saved.");
  profile = await read();
  const primary = profile.primary_photo_path;
  const primaryResult = await action("changePhoto", {
    revision: String(profile.revision),
    slot: "primary",
    operation: "replace",
    photo: photo(),
  });
  assert.equal(primaryResult.result?.success, "Photos saved.");
  assert.ok(
    (await owner.auth.storage.from("profile-photos").download(primary)).error,
    "old primary cleaned",
  );
  const faultFile = process.env.PALS_PROFILE_FAULT_FILE;
  if (faultFile) {
    const faults = (queue) =>
      writeFileSync(faultFile, JSON.stringify(queue), { mode: 0o600 });
    profile = await read();
    faults([{ method: "POST", path: "/storage/v1/object/profile-photos/" }]);
    const uploadFailed = await action("changePhoto", {
      revision: String(profile.revision),
      slot: "new",
      operation: "add",
      photo: photo(),
    });
    assert.match(uploadFailed.result.error, /upload/);
    assert.equal((await read()).revision, profile.revision);
    const beforeUploadLoss = (
      await owner.auth.storage.from("profile-photos").list(a.id)
    ).data.length;
    faults([
      {
        method: "POST",
        path: "/storage/v1/object/profile-photos/",
        afterCommit: true,
      },
    ]);
    const uploadLost = await action("changePhoto", {
      revision: String(profile.revision),
      slot: "new",
      operation: "add",
      photo: photo(),
    });
    assert.match(uploadLost.result.error, /confirm the photo upload/);
    assert.equal(
      uploadLost.result.cleanupNeeded,
      false,
      "committed upload with lost response cleaned",
    );
    assert.equal((await read()).revision, profile.revision);
    assert.equal(
      (await owner.auth.storage.from("profile-photos").list(a.id)).data.length,
      beforeUploadLoss,
      "no orphan remains after upload response loss",
    );
    faults([
      {
        method: "POST",
        path: "/storage/v1/object/profile-photos/",
        afterCommit: true,
      },
      { method: "DELETE", path: "/storage/v1/object/profile-photos" },
    ]);
    const uploadCleanupLost = await action("changePhoto", {
      revision: String(profile.revision),
      slot: "new",
      operation: "add",
      photo: photo(),
    });
    assert.equal(
      uploadCleanupLost.result.cleanupNeeded,
      true,
      "failed cleanup of committed upload is reported",
    );
    assert.equal((await read()).revision, profile.revision);
    assert.equal(
      (await action("cleanupPhotos")).result.cleanupNeeded,
      false,
      "upload leftover cleanup retries",
    );
    faults([
      { method: "PATCH", path: "/rest/v1/profiles" },
      { method: "DELETE", path: "/storage/v1/object/profile-photos" },
    ]);
    const cleanupFailed = await action("changePhoto", {
      revision: String(profile.revision),
      slot: "new",
      operation: "add",
      photo: photo(),
    });
    assert.ok(cleanupFailed.result.error);
    assert.equal(cleanupFailed.result.cleanupNeeded, true);
    assert.equal((await read()).revision, profile.revision);
    const cleaned = await action("cleanupPhotos");
    assert.equal(cleaned.result.cleanupNeeded, false);
    faults([{ method: "PATCH", path: "/rest/v1/profiles", afterCommit: true }]);
    const lost = await action("changePhoto", {
      revision: String(profile.revision),
      slot: "new",
      operation: "add",
      photo: photo(),
    });
    assert.match(lost.result.error, /couldn’t confirm/);
    assert.equal(
      lost.result.cleanupNeeded,
      true,
      "ambiguous result cannot clean a referenced upload",
    );
    const committed = await read();
    assert.equal(
      committed.additional_photo_paths.length,
      profile.additional_photo_paths.length + 1,
    );
    assert.equal(
      (
        await owner.auth.storage
          .from("profile-photos")
          .download(committed.additional_photo_paths.at(-1))
      ).error,
      null,
      "response loss preserves committed image",
    );
    const cleanup = await action("cleanupPhotos");
    assert.equal(cleanup.result.cleanupNeeded, false);
    assert.equal(
      (
        await owner.auth.storage
          .from("profile-photos")
          .download(committed.additional_photo_paths.at(-1))
      ).error,
      null,
      "retry cleanup preserves all references",
    );
  }
  // Leave the previous auth suite with a current primary and no extra references.
  profile = await read();
  await owner.auth
    .from("profiles")
    .update({ additional_photo_paths: [] })
    .eq("user_id", a.id);
  await owner.auth.storage
    .from("profile-photos")
    .remove(profile.additional_photo_paths);
  return (await read()).primary_photo_path;
}

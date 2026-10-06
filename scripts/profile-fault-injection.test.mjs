import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("local preload holds only a completed matching response and preserves transport faults", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pals-response-hold-"));
  const file = join(dir, "faults.json");
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    APP_ENV: process.env.APP_ENV,
    PALS_PROFILE_FAULT_FILE: process.env.PALS_PROFILE_FAULT_FILE,
  };
  let calls = 0;
  try {
    process.env.APP_ENV = "local";
    process.env.PALS_PROFILE_FAULT_FILE = file;
    writeFileSync(file, "[]", { mode: 0o600 });
    globalThis.fetch = async () => {
      calls++;
      return new Response("real response");
    };
    await import(`./profile-fault-injection.mjs?test=${crypto.randomUUID()}`);

    writeFileSync(
      file,
      JSON.stringify([
        {
          method: "POST",
          path: "/rest/v1/rpc/read_hangout_messages",
          holdAfterResponse: true,
        },
      ]),
      { mode: 0o600 },
    );
    assert.equal(
      (
        await fetch(
          "https://example.invalid/rest/v1/rpc/read_hangout_messages",
          { method: "POST" },
        )
      ).status,
      200,
    );
    assert.equal(
      JSON.parse(readFileSync(file, "utf8")).length,
      1,
      "nonlocal request does not consume the hold",
    );

    const pending = fetch(
      "http://127.0.0.1:54321/rest/v1/rpc/read_hangout_messages",
      { method: "POST" },
    );
    const reached = `${file}.response-reached`;
    const release = `${file}.response-release`;
    const deadline = Date.now() + 2_000;
    while (!existsSync(reached) && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(existsSync(reached), "real response consumed before release");
    assert.equal(
      JSON.parse(readFileSync(file, "utf8")).length,
      0,
      "hold consumed exactly once",
    );
    let settled = false;
    pending.then(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(settled, false, "request remains in flight until release");
    writeFileSync(release, "release", { mode: 0o600 });
    assert.equal(await (await pending).text(), "real response");

    writeFileSync(
      file,
      JSON.stringify([
        {
          method: "POST",
          path: "/storage/v1/object/profile-photos/",
          afterCommit: true,
        },
      ]),
      { mode: 0o600 },
    );
    const fault = await fetch(
      "http://127.0.0.1:54321/storage/v1/object/profile-photos/example",
      { method: "POST" },
    );
    assert.equal(
      fault.status,
      503,
      "existing after-commit fault remains available",
    );
    assert.equal(calls, 3, "matched calls reach the original fetch once each");
  } finally {
    writeFileSync(`${file}.response-release`, "release", { mode: 0o600 });
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

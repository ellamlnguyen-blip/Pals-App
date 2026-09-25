import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyticsEvents,
  localAnalyticsConfig,
  localCaptureSink,
  readAnalyticsAccess,
  validCaptureArguments,
} from "../apps/web/lib/analytics-core.ts";

const sink = "http://127.0.0.1:4019/capture/";
const token = "local-test-palsanalytics";
const actor = "1f11a3e3-a5c1-4ad1-a57a-3a72c432ad9e";

test("exactly the reviewed events have a one-argument runtime entry", () => {
  assert.equal(analyticsEvents.length, 14);
  assert.equal(new Set(analyticsEvents).size, 14);
  for (const event of analyticsEvents)
    assert.equal(validCaptureArguments([event]), true);
  for (const args of [
    ["pageview"],
    ["hangout_created", { hangoutId: actor }],
    ["hangout_created", undefined],
    [{ event: "hangout_created" }],
    [],
  ])
    assert.equal(validCaptureArguments(args), false);
});

test("raw local configuration rejects hosted and ambiguous targets", () => {
  assert.deepEqual(localAnalyticsConfig("local", sink, token), { sink, token });
  assert.equal(localAnalyticsConfig(undefined, sink, token), null);
  assert.equal(localAnalyticsConfig("staging", sink, token), null);
  assert.equal(localAnalyticsConfig("production", sink, token), null);
  assert.equal(localAnalyticsConfig("local", sink, "phc_realproject"), null);
  for (const value of [
    "https://us.i.posthog.com/capture/",
    "http://localhost:4019/capture/",
    "http://127.1:4019/capture/",
    "http://2130706433:4019/capture/",
    "http://0x7f000001:4019/capture/",
    "http://0177.0.0.1:4019/capture/",
    "http://127.0.0.1:04019/capture/",
    "http://user@127.0.0.1:4019/capture/",
    "http://127.0.0.1:4019/capture",
    "http://127.0.0.1:4019/capture//",
    "http://127.0.0.1:4019/capture/?a=1",
    "http://127.0.0.1:4019/capture/#x",
    "http://127.0.0.1:4019/capture/../capture/",
    "http://[::ffff:127.0.0.1]:4019/capture/",
    "http://127.0.0.1:65536/capture/",
  ])
    assert.equal(localCaptureSink(value), null, value);
  assert.equal(
    localCaptureSink("http://[::1]:4019/capture/"),
    "http://[::1]:4019/capture/",
  );
});

test("access check is no-store, owner-bound and fails closed", async () => {
  let options;
  const fetcher = async (_url, init) => {
    options = init;
    return { ok: true, json: async () => ({ kind: "ok", actor, sink, token }) };
  };
  assert.deepEqual(await readAnalyticsAccess(fetcher), {
    kind: "ok",
    actor,
    sink,
    token,
  });
  assert.equal(options.cache, "no-store");
  assert.equal(options.credentials, "same-origin");
  assert.equal(options.redirect, "error");
  assert.deepEqual(
    await readAnalyticsAccess(async () => ({ ok: false, status: 403 })),
    { kind: "denied" },
  );
  assert.deepEqual(
    await readAnalyticsAccess(async () => {
      throw Error("offline");
    }),
    { kind: "error" },
  );
  assert.deepEqual(
    await readAnalyticsAccess(async () => ({
      ok: true,
      json: async () => ({
        kind: "ok",
        actor,
        sink: "https://us.i.posthog.com/capture/",
        token,
      }),
    })),
    { kind: "error" },
  );
});

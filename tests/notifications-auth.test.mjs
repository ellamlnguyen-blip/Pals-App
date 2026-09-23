import test from "node:test";
import assert from "node:assert/strict";
import {
  notificationProbeState,
  notificationTransitionState,
} from "../apps/web/app/notifications/notification-auth-state.ts";
test("overlapping transitions stay masked until both current-owner probes settle", () => {
  const pending = new Set(),
    settled = new Map();
  assert.equal(
    notificationTransitionState(pending, settled, {
      phase: "begin",
      token: "first",
    }),
    "mask",
  );
  assert.equal(
    notificationTransitionState(pending, settled, {
      phase: "settled",
      token: "first",
    }),
    "verify",
  );
  assert.equal(
    notificationTransitionState(pending, settled, {
      phase: "begin",
      token: "second",
    }),
    "mask",
  );
  assert.equal(
    notificationProbeState(pending, settled, "first", 200, true),
    "retry",
  );
  assert.equal(pending.size, 1);
  assert.equal(
    notificationTransitionState(pending, settled, {
      phase: "settled",
      token: "second",
    }),
    "verify",
  );
  assert.equal(
    notificationProbeState(pending, settled, "second", 200, true),
    "read",
  );
  assert.equal(pending.size, 0);
});
test("uncertain or wrong-account probes preserve the mask and remain retryable", () => {
  const pending = new Set(),
    settled = new Map();
  notificationTransitionState(pending, settled, {
    phase: "begin",
    token: "one",
  });
  notificationTransitionState(pending, settled, {
    phase: "cancelled",
    token: "one",
  });
  assert.equal(
    notificationProbeState(pending, settled, "one", 503, false),
    "wait",
  );
  assert.equal(
    notificationProbeState(pending, settled, "one", 200, false),
    "wait",
  );
  assert.equal(pending.has("one"), true);
  assert.equal(settled.has("one"), true);
  assert.equal(
    notificationProbeState(pending, settled, "one", 200, true),
    "read",
  );
  assert.equal(
    notificationProbeState(pending, settled, "one", 200, true),
    "wait",
  );
});
test("denied transition cannot reveal previous account rows", () => {
  const pending = new Set(["signout"]),
    settled = new Map([["signout", "settled"]]);
  assert.equal(
    notificationProbeState(pending, settled, "signout", 403, false),
    "deny",
  );
  assert.equal(pending.has("signout"), true);
});

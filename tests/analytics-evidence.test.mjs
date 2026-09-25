import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  firstRequestConfirmed,
  friendAcceptanceConfirmed,
} from "../apps/web/lib/analytics-evidence.ts";

test("friend request state projection cannot emit a new-commit event", () => {
  const control = readFileSync(
    new URL("../apps/web/app/people/friend-control.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(control, /analytics\.capture\("friend_request_sent"\)/);
});

test("acceptance requires the committed transition result", () => {
  assert.equal(
    friendAcceptanceConfirmed({
      state: "known",
      relationship: { state: "accepted" },
    }),
    true,
  );
  assert.equal(
    friendAcceptanceConfirmed({
      state: "stale",
      relationship: { state: "accepted" },
    }),
    false,
  );
  assert.equal(
    friendAcceptanceConfirmed({
      state: "known",
      relationship: { state: "pending" },
    }),
    false,
  );
});

test("DM and chat count only an acknowledged first key", () => {
  assert.equal(firstRequestConfirmed(false, "ok"), true);
  assert.equal(firstRequestConfirmed(true, "ok"), false);
  for (const kind of ["denied", "error", "conflict", "uncertain"])
    assert.equal(firstRequestConfirmed(false, kind), false);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  firstRequestConfirmed,
  friendAcceptanceConfirmed,
  newFriendRequestConfirmed,
} from "../apps/web/lib/analytics-evidence.ts";

test("a first friend request requires a newly confirmed outgoing pending state", () => {
  const committed = {
    state: "known",
    relationship: { state: "pending", direction: "outgoing" },
  };
  assert.equal(newFriendRequestConfirmed(false, committed), true);
  assert.equal(newFriendRequestConfirmed(true, committed), false);
  for (const result of [
    { state: "unknown", relationship: committed.relationship },
    { state: "stale", relationship: committed.relationship },
    { state: "known", relationship: null },
    {
      state: "known",
      relationship: { state: "pending", direction: "incoming" },
    },
  ])
    assert.equal(newFriendRequestConfirmed(false, result), false);
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

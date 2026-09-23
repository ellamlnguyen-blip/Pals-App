import assert from "node:assert/strict";
import test from "node:test";
import { emptyCreateOutcome } from "../apps/web/lib/friendship-create-outcome.ts";
import { blockReviewOutcome } from "../apps/web/lib/relationship-block-outcome.ts";

test("revoked People detail after a denied create clears text and disables retry", () => {
  const race = emptyCreateOutcome("denied", false);
  assert.equal(race.state, "unavailable");
  assert.equal(race.relationship, null);
  assert.doesNotMatch(race.message, /retry this same request key/i);
});

test("only a transport-uncertain, still-visible empty pair retains same-key retry", () => {
  assert.equal(emptyCreateOutcome("uncertain", true).state, "known");
  assert.match(
    emptyCreateOutcome("uncertain", true).message,
    /same request key/,
  );
  assert.equal(emptyCreateOutcome("uncertain", false).state, "unavailable");
  assert.equal(emptyCreateOutcome("denied", true).state, "stale");
  assert.equal(emptyCreateOutcome("confirmed", true).state, "stale");
});

test("known-ID block control locks after unknown outbound proof", () => {
  assert.equal(blockReviewOutcome("unknown"), "unknown");
  assert.equal(blockReviewOutcome("visible"), "unknown");
  assert.equal(blockReviewOutcome("hidden"), "confirmed");
  for (const result of ["unknown", "visible", "hidden"])
    assert.notEqual(blockReviewOutcome(result), "ready");
});

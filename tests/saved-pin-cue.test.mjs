import assert from "node:assert/strict";
import test from "node:test";
import { pinCue, pinPeriod } from "../apps/web/app/hangouts/saved/pin-cue.ts";

test("emoji cues derive only from public title and description", () => {
  assert.equal(pinCue({ title: "Tacos after class", description: null }), "🌮");
  assert.equal(pinCue({ title: "Meet up", description: "Bring a book" }), "📚");
  assert.equal(pinCue({ title: "Meet up", description: null }), "📍");
});

test("pin time shade uses UNC civil intervals", () => {
  const now = new Date("2026-10-18T20:00:00Z"); // Sunday afternoon EDT
  assert.equal(pinPeriod({ starts_at: "2026-10-18T21:00:00Z" }, now), "today");
  assert.equal(
    pinPeriod({ starts_at: "2026-10-19T15:00:00Z" }, now),
    "tomorrow",
  );
  assert.equal(pinPeriod({ starts_at: "2026-10-20T15:00:00Z" }, now), "later");
});

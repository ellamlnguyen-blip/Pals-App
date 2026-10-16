import assert from "node:assert/strict";
import test from "node:test";
import { formatHangoutDateTime } from "./chat-date.ts";

test("Hangout strip separates campus date and time across daylight saving", () => {
  assert.equal(
    formatHangoutDateTime("2026-10-16T18:00:00Z"),
    "Oct 16, 2026 · 2:00 PM ET",
  );
  assert.equal(
    formatHangoutDateTime("2026-12-16T18:00:00Z"),
    "Dec 16, 2026 · 1:00 PM ET",
  );
});

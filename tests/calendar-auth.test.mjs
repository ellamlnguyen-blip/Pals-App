import assert from "node:assert/strict";
import test from "node:test";
import { calendarAuthMayReload } from "../apps/web/lib/calendar-auth.ts";

test("overlapping auth changes keep Calendar masked until the final token settles", () => {
  const pending = new Set();
  assert.equal(
    calendarAuthMayReload(pending, { phase: "begin", token: "A" }),
    false,
  );
  assert.equal(
    calendarAuthMayReload(pending, { phase: "begin", token: "B" }),
    false,
  );
  assert.equal(
    calendarAuthMayReload(pending, { phase: "settled", token: "unknown" }),
    false,
  );
  assert.equal(
    calendarAuthMayReload(pending, { phase: "cancelled", token: "A" }),
    false,
  );
  assert.equal(calendarAuthMayReload(pending, { phase: "revalidate" }), false);
  assert.equal(
    calendarAuthMayReload(pending, { phase: "settled", token: "B" }),
    true,
  );
  assert.equal(pending.size, 0);
});

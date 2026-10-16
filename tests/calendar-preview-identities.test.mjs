import assert from "node:assert/strict";
import test from "node:test";
import { sameCalendarPreviewIdentities } from "../apps/web/lib/calendar-preview-identities.ts";

const maya = { name: "Maya", photoRevision: 3 };
const leo = { name: "Leo", photoRevision: null };

test("identical authorized identities compare equal regardless of RPC completion order", () => {
  assert.equal(
    sameCalendarPreviewIdentities(
      { maya, leo },
      { leo: { ...leo }, maya: { ...maya } },
    ),
    true,
  );
});

test("identity, photo, and visible-set changes deny a preview", () => {
  const before = { maya, leo };
  assert.equal(
    sameCalendarPreviewIdentities(before, {
      maya,
      leo: { ...leo, name: "Leona" },
    }),
    false,
  );
  assert.equal(
    sameCalendarPreviewIdentities(before, {
      maya: { ...maya, photoRevision: 4 },
      leo,
    }),
    false,
  );
  assert.equal(sameCalendarPreviewIdentities(before, { maya }), false);
  assert.equal(
    sameCalendarPreviewIdentities(before, {
      maya,
      leo,
      zed: { name: "Zed", photoRevision: null },
    }),
    false,
  );
});

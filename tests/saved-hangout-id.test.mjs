import assert from "node:assert/strict";
import test from "node:test";
import { validSavedHangoutId } from "../apps/web/lib/saved-hangouts-types.ts";

test("saved Hangout actions accept complete UUIDs and reject malformed IDs", () => {
  assert.equal(
    validSavedHangoutId("01ccc564-0cc8-4196-bc0d-00b669cda352"),
    true,
  );
  assert.equal(
    validSavedHangoutId("52030000-0000-4000-8001-000000000110"),
    true,
  );
  assert.equal(validSavedHangoutId("01ccc564-0cc8-4196-00b669cda352"), false);
  assert.equal(
    validSavedHangoutId("01ccc564-0cc8-4196-bc0d-00b669cda35z"),
    false,
  );
});

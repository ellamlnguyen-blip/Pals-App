import assert from "node:assert/strict";
import test from "node:test";
import { validPhotoOrder } from "../apps/web/lib/owner-photo-order.ts";

test("extra photo reorder only permutes the exact owned path set", () => {
  const owned = ["owner/a.webp", "owner/b.webp", "owner/c.webp"];
  assert.equal(validPhotoOrder(owned, [owned[1], owned[0], owned[2]]), true);
  assert.equal(validPhotoOrder(owned, owned), false);
  assert.equal(validPhotoOrder(owned, [owned[0], owned[0], owned[2]]), false);
  assert.equal(
    validPhotoOrder(owned, [owned[1], owned[0], "other/x.webp"]),
    false,
  );
  assert.equal(validPhotoOrder(owned, [owned[1], owned[0]]), false);
  assert.equal(validPhotoOrder(owned, "bad"), false);
  assert.equal(validPhotoOrder([], []), false);
});

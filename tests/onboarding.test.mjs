import assert from "node:assert/strict";
import test from "node:test";
import {
  approvedUncEmail,
  profileFields,
  photoExtension,
} from "../packages/validation/src/index.ts";
test("UNC UX validation uses the accepted exact normalized domains", () => {
  for (const domain of [
    "live.unc.edu",
    "unc.edu",
    "ad.unc.edu",
    "business.unc.edu",
    "kenan-flagler.unc.edu",
  ])
    assert.ok(approvedUncEmail(`student@${domain.toUpperCase()}`));
  for (const email of [
    "student@sub.unc.edu",
    "student@unc.edu.evil.test",
    "student@@unc.edu",
    "student@unc.edu ",
    "@unc.edu",
    "student@example.com",
  ])
    assert.equal(approvedUncEmail(email), false);
});
test("profile fields reject empty and invalid values", () => {
  const form = new FormData();
  assert.equal(profileFields(form), null);
  for (const [key, value] of Object.entries({
    real_name: " Test Student ",
    graduation_year: "2028",
    major: "Math",
    bio: "Walking around campus",
  }))
    form.set(key, value);
  assert.equal(profileFields(form).real_name, "Test Student");
  form.set("graduation_year", "NaN");
  assert.equal(profileFields(form), null);
});
test("photo type cannot be spoofed by filename or MIME label", () => {
  assert.equal(
    photoExtension(new TextEncoder().encode("<svg><script/></svg>")),
    null,
  );
  assert.equal(photoExtension(Uint8Array.from([255, 216, 255, 224])), "jpg");
  assert.equal(
    photoExtension(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "png",
  );
});

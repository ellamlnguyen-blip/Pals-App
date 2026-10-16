import assert from "node:assert/strict";
import test from "node:test";
import {
  primaryCardPhotoRevision,
  resolveCardPhotoRevisions,
} from "../apps/web/lib/people-card-photos.ts";

const subject = "79000000-0000-4000-8000-000000000002";

test("directory photo projection accepts only the requested subject's primary opaque revision", () => {
  const valid = {
    account_id: subject,
    photo_slots: ["0", "primary"],
    photo_revision: 7,
    hometown: "private unless rich consent remains active",
  };
  assert.equal(primaryCardPhotoRevision(subject, valid), 7);
  for (const invalid of [
    null,
    { ...valid, account_id: "other" },
    { ...valid, photo_slots: ["0"] },
    { ...valid, photo_slots: "primary" },
    { ...valid, photo_revision: 0 },
    { ...valid, photo_revision: 1.5 },
    { ...valid, photo_revision: Number.MAX_SAFE_INTEGER + 1 },
  ])
    assert.equal(primaryCardPhotoRevision(subject, invalid), null);
});

test("directory lookups stay within four visible results at a time and fail to fallback", async () => {
  const subjects = Array.from({ length: 9 }, (_, index) => `subject-${index}`);
  let active = 0;
  let maximum = 0;
  const revisions = await resolveCardPhotoRevisions(subjects, async (id) => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    active--;
    if (id === "subject-3") throw new Error("optional rich lookup failed");
    return { account_id: id, photo_slots: ["primary"], photo_revision: 4 };
  });
  assert.equal(maximum, 4);
  assert.deepEqual(
    Object.keys(revisions).sort(),
    subjects.filter((id) => id !== "subject-3").sort(),
  );
  assert.equal(revisions["subject-3"], undefined);
});

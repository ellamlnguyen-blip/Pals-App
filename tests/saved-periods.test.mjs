import assert from "node:assert/strict";
import test from "node:test";
import {
  savedPeriod,
  savedPeriodBounds,
  selectedSavedStart,
  validPeriodMask,
} from "../apps/web/lib/saved-hangouts-types.ts";

const at = (value) => new Date(value);

test("period masks accept exactly four ASCII bits and combine independently", () => {
  for (const mask of ["0000", "1010", "1111"])
    assert.equal(validPeriodMask(mask), true);
  for (const mask of ["", "101", "10100", "101x", "1010\n", "１２１０", null])
    assert.equal(validPeriodMask(mask), false);
  const cutoff = at("2026-10-14T16:00:00Z");
  assert.equal(
    selectedSavedStart("0000", cutoff, at("2026-10-14T17:00:00Z")),
    false,
  );
  assert.equal(
    selectedSavedStart("1001", cutoff, at("2026-10-14T17:00:00Z")),
    true,
  );
  assert.equal(
    selectedSavedStart("1001", cutoff, at("2026-10-15T17:00:00Z")),
    false,
  );
  assert.equal(
    selectedSavedStart("1111", cutoff, at("2026-10-14T15:59:59Z")),
    false,
  );
  assert.equal(
    selectedSavedStart("upcoming", cutoff, at("2026-10-14T15:59:59Z")),
    false,
  );
  assert.equal(
    selectedSavedStart("all", cutoff, at("2026-10-14T15:59:59Z")),
    true,
  );
});

test("Sunday Tomorrow wins over Monday week boundary through spring DST", () => {
  const cutoff = at("2026-03-08T15:00:00Z"); // Sunday, 11:00 EDT
  assert.equal(savedPeriod(cutoff, at("2026-03-09T03:59:59Z")), "today");
  assert.equal(savedPeriod(cutoff, at("2026-03-09T04:00:00Z")), "tomorrow");
  assert.equal(savedPeriod(cutoff, at("2026-03-10T04:00:00Z")), "later");
  assert.equal(
    selectedSavedStart("0100", cutoff, at("2026-03-09T04:00:00Z")),
    true,
  );
  assert.equal(
    selectedSavedStart("0010", cutoff, at("2026-03-09T04:00:00Z")),
    false,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(savedPeriodBounds(cutoff)).map(([key, value]) => [
        key,
        value.toISOString(),
      ]),
    ),
    {
      tomorrow: "2026-03-09T04:00:00.000Z",
      dayAfterTomorrow: "2026-03-10T04:00:00.000Z",
      nextMonday: "2026-03-09T04:00:00.000Z",
      later: "2026-03-10T04:00:00.000Z",
    },
  );
});

test("fall DST, month and year transitions use New York civil days", () => {
  const fall = at("2026-11-01T04:30:00Z"); // first 00:30 EDT
  assert.equal(savedPeriod(fall, at("2026-11-02T04:59:59Z")), "today");
  assert.equal(savedPeriod(fall, at("2026-11-02T05:00:00Z")), "tomorrow");
  assert.equal(
    savedPeriodBounds(fall).tomorrow.toISOString(),
    "2026-11-02T05:00:00.000Z",
  );
  const year = at("2026-12-31T17:00:00Z");
  assert.equal(savedPeriod(year, at("2027-01-01T05:00:00Z")), "tomorrow");
  assert.equal(savedPeriod(year, at("2027-01-02T05:00:00Z")), "thisWeek");
  assert.equal(savedPeriod(year, at("2027-01-04T05:00:00Z")), "later");
  assert.equal(
    savedPeriod(at("2027-01-04T17:00:00Z"), at("2027-01-11T05:00:00Z")),
    "later",
  );
});

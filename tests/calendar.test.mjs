import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarRange,
  validSelection,
  overlaps,
  compareCalendar,
} from "../apps/web/lib/calendar-time.ts";
const select = (date, view = "day") => ({ date, view, filter: "discoverable" });
test("Calendar validates bounded real dates and explicit filters", () => {
  for (const date of [
    "2027-02-30",
    "2027-13-01",
    "1999-12-31",
    "2101-01-01",
    "2027-1-1",
    "x",
  ])
    assert.equal(validSelection(select(date)), false);
  assert.equal(validSelection(select("2028-02-29")), true);
  assert.equal(
    validSelection({ ...select("2027-01-01"), filter: "friends" }),
    false,
  );
  assert.equal(
    validSelection({ ...select("2027-01-01"), view: "month" }),
    false,
  );
});
test("Campus ranges use exclusive DST-safe midnights and Monday weeks", () => {
  for (const [date, hours] of [
    ["2027-03-14", 23],
    ["2027-11-07", 25],
  ]) {
    const range = calendarRange(select(date));
    assert.equal(
      (Date.parse(range.end) - Date.parse(range.start)) / 3600000,
      hours,
    );
  }
  const spring = calendarRange(select("2027-03-14", "week"));
  assert.equal(spring.days[0], "2027-03-08");
  assert.equal(spring.days[6], "2027-03-14");
  assert.equal(
    (Date.parse(spring.end) - Date.parse(spring.start)) / 3600000,
    167,
  );
});
test("Overlap keeps cross-midnight plans, excludes touching boundaries and bounds unknown ends", () => {
  const { start, end } = calendarRange(select("2027-03-14"));
  assert.equal(
    overlaps(
      { starts_at: "2027-03-14T04:00Z", ends_at: "2027-03-14T06:00Z" },
      start,
      end,
    ),
    true,
  );
  assert.equal(
    overlaps({ starts_at: "2027-03-14T04:00Z", ends_at: start }, start, end),
    false,
  );
  assert.equal(overlaps({ starts_at: end, ends_at: null }, start, end), false);
  assert.equal(
    overlaps({ starts_at: "2027-03-14T04:00Z", ends_at: null }, start, end),
    false,
  );
  assert.equal(overlaps({ starts_at: start, ends_at: null }, start, end), true);
  assert.deepEqual(
    [
      { id: "b", starts_at: start },
      { id: "a", starts_at: start },
    ]
      .sort(compareCalendar)
      .map((row) => row.id),
    ["a", "b"],
  );
});

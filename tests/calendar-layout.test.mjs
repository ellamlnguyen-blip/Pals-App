import assert from "node:assert/strict";
import test from "node:test";
import {
  CALENDAR_HOUR_PX,
  layoutDay,
  occursOnDay,
  visibleHours,
} from "../apps/web/lib/calendar-layout.ts";

const event = (id, start, end) => ({
  id,
  starts_at: `2027-06-01T${start}:00-04:00`,
  ends_at: end ? `2027-06-01T${end}:00-04:00` : null,
});

test("clock rows and event positions share the same scale and expand for early and late plans", () => {
  const evening = event("evening", "18:30", "19:30");
  const morning = event("morning", "06:15", "07:15");
  const late = event("late", "22:00", "23:00");
  assert.equal(CALENDAR_HOUR_PX, 48);
  assert.deepEqual(visibleHours([evening], ["2027-06-01"]), {
    first: 8,
    last: 21,
  });
  assert.equal(layoutDay([evening], "2027-06-01", 8)[0].top, 504);
  assert.deepEqual(visibleHours([morning, evening, late], ["2027-06-01"]), {
    first: 6,
    last: 23,
  });
});

test("simultaneous plans occupy independent lanes and sequential plans reuse space", () => {
  const items = [
    event("a", "18:00", "19:00"),
    event("b", "18:15", "18:45"),
    event("c", "18:30", "19:15"),
    event("d", "20:00", "21:00"),
  ];
  const placed = layoutDay(items, "2027-06-01", 8);
  assert.deepEqual(
    placed.slice(0, 3).map((item) => item.width),
    ["33.333333333333336%", "33.333333333333336%", "33.333333333333336%"],
  );
  assert.deepEqual(
    placed.slice(0, 3).map((item) => item.left),
    ["0%", "33.33333333333333%", "66.66666666666666%"],
  );
  assert.equal(placed[3].width, "100%");
});

test("brief adjacent plans keep 44px targets without covering each other", () => {
  const placed = layoutDay(
    [event("first", "18:00", "18:05"), event("second", "18:10", "18:15")],
    "2027-06-01",
    8,
  );
  assert.deepEqual(
    placed.map((item) => item.height),
    [44, 44],
  );
  assert.deepEqual(
    placed.map((item) => item.width),
    ["50%", "50%"],
  );
  assert.ok(placed[0].top + placed[0].height > placed[1].top);
});

test("last-minute plans stay within the 24-hour grid and share no visual lane", () => {
  const placed = layoutDay(
    [event("near", "23:00", "23:05"), event("late", "23:55", "23:59")],
    "2027-06-01",
    8,
  );
  const gridHeight = (24 - 8) * CALENDAR_HOUR_PX;
  assert.deepEqual(
    placed.map((item) => item.width),
    ["50%", "50%"],
  );
  assert.notEqual(placed[0].left, placed[1].left);
  for (const item of placed) {
    assert.equal(item.height, 44);
    assert.ok(item.top + item.height <= gridHeight);
  }
});

test("multi-day and repeated DST hour remain represented", () => {
  const overnight = {
    id: "overnight",
    starts_at: "2027-06-01T23:30:00-04:00",
    ends_at: "2027-06-02T01:30:00-04:00",
  };
  assert.equal(occursOnDay(overnight, "2027-06-01"), true);
  assert.equal(occursOnDay(overnight, "2027-06-02"), true);
  const repeated = [
    {
      id: "first",
      starts_at: "2027-11-07T01:15:00-04:00",
      ends_at: "2027-11-07T01:45:00-04:00",
    },
    {
      id: "second",
      starts_at: "2027-11-07T01:15:00-05:00",
      ends_at: "2027-11-07T01:45:00-05:00",
    },
  ];
  assert.equal(layoutDay(repeated, "2027-11-07", 1).length, 2);
  assert.equal(layoutDay(repeated, "2027-11-07", 1)[0].width, "50%");
});

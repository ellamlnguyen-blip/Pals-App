import assert from "node:assert/strict";
import test from "node:test";
import {
  campusLocal,
  resolveCampusLocal,
} from "../apps/web/lib/hangout-time.ts";

test("campus time maps only unambiguous wall times to instants", () => {
  assert.equal(
    resolveCampusLocal("2027-01-15T18:00").instant,
    "2027-01-15T23:00:00.000Z",
  );
  assert.equal(
    resolveCampusLocal("2027-07-15T18:00").instant,
    "2027-07-15T22:00:00.000Z",
  );
  assert.match(resolveCampusLocal("2027-03-14T02:30").error, /does not exist/);
  assert.match(resolveCampusLocal("2027-11-07T01:30").error, /occurs twice/);
  assert.equal(campusLocal("2027-11-07T05:30:00.000Z"), "2027-11-07T01:30");
  assert.equal(campusLocal("2027-11-07T06:30:00.000Z"), "2027-11-07T01:30");
});

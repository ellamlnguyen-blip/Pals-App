import assert from "node:assert/strict";
import test from "node:test";
import {
  MOCK_HANGOUTS,
  campusLocation,
  filterMockHangouts,
  mapFeatures,
} from "../apps/web/app/hangouts/fixtures.ts";

test("map data contains only explicit mock public-area fields", () => {
  const data = mapFeatures(MOCK_HANGOUTS);
  assert.equal(data.features.length, 5);
  for (const feature of data.features) {
    assert.match(feature.id, /^mock-/);
    assert.deepEqual(Object.keys(feature.properties).sort(), ["id", "title"]);
    assert.ok(campusLocation(...feature.geometry.coordinates));
    assert.equal(feature.geometry.type, "Point");
  }
});
test("mock filters combine categories and time, including a genuine empty result", () => {
  assert.equal(filterMockHangouts("All", "Any time").length, 5);
  assert.equal(filterMockHangouts("Study", "Afternoon").length, 1);
  assert.equal(filterMockHangouts("Study", "Evening").length, 0);
  assert.deepEqual(mapFeatures([]).features, []);
});
test("one-shot location only produces a coarse UNC viewport", () => {
  assert.deepEqual(campusLocation(-79.0486234, 35.9092456), [-79.049, 35.909]);
  for (const coordinates of [
    [-73.9, 40.7],
    [NaN, 35.91],
    [-79.05, Infinity],
    [-79.05, -35.9],
  ])
    assert.equal(campusLocation(...coordinates), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBrowseContext,
  campusViewport,
  rememberViewport,
  readViewport,
} from "../apps/web/app/hangouts/saved/browse-context.ts";

test("browse return accepts only recent filter and position preferences", () => {
  const now = 2_000_000;
  const context = {
    time: "all",
    joining: "open",
    scrollY: 540,
    savedAt: now - 1000,
  };
  assert.deepEqual(parseBrowseContext(JSON.stringify(context), now), context);
  for (const value of [
    null,
    "{",
    JSON.stringify({ ...context, time: "private" }),
    JSON.stringify({ ...context, joining: "joined" }),
    JSON.stringify({ ...context, scrollY: -1 }),
    JSON.stringify({ ...context, scrollY: "540" }),
    JSON.stringify({ ...context, savedAt: now + 1 }),
    JSON.stringify({ ...context, savedAt: now - 30 * 60_000 - 1 }),
  ])
    assert.equal(parseBrowseContext(value, now), null);
});

test("return camera is campus bounded, coarse, ephemeral and expires", () => {
  const bounds = { west: -79.1, east: -79, south: 35.8, north: 36 };
  const camera = campusViewport(
    { longitude: -79.05552, latitude: 35.91234, zoom: 14 },
    bounds,
  );
  assert.deepEqual(camera, { longitude: -79.056, latitude: 35.912, zoom: 14 });
  for (const view of [
    { longitude: -78, latitude: 35.9, zoom: 14 },
    { longitude: -79.05, latitude: 35.9, zoom: 100 },
    { longitude: NaN, latitude: 35.9, zoom: 14 },
  ])
    assert.equal(campusViewport(view, bounds), null);
  rememberViewport(camera, 1000);
  assert.deepEqual(readViewport(2000), camera);
  assert.equal(readViewport(999), null);
  assert.equal(readViewport(1000 + 30 * 60_000 + 1), null);
  rememberViewport(null);
  assert.equal(readViewport(), null);
});

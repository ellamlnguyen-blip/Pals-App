import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceCombinedCursor,
  parseCombinedCursor,
} from "../apps/web/app/chats/combined-paging.ts";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const dm = (n) => ({
  generation_id: id(n),
  created_at: new Date(Date.UTC(2026, 9, 15, 0, 0, n)).toISOString(),
});
const hangout = (n) => ({ hangout_id: id(n) });

test("paired source cursors consume every fetched row without skipping either source", () => {
  const first = parseCombinedCursor(null);
  const page = advanceCombinedCursor(
    first,
    Array.from({ length: 24 }, (_, i) => dm(49 - i)),
    Array.from({ length: 24 }, (_, i) => hangout(i + 1)),
  );
  assert.deepEqual(page, {
    dmTime: dm(26).created_at,
    dmGeneration: id(26),
    hangoutId: id(24),
    dmDone: false,
    hangoutDone: false,
  });
  const second = advanceCombinedCursor(page, [dm(25)], [hangout(25)]);
  assert.equal(second, null);
});

test("a finished source is not restarted while another source continues", () => {
  const first = parseCombinedCursor(null);
  const page = advanceCombinedCursor(
    first,
    [dm(1)],
    Array.from({ length: 24 }, (_, i) => hangout(i + 1)),
  );
  assert.equal(page.dmDone, true);
  assert.equal(page.hangoutDone, false);
  const second = advanceCombinedCursor(page, [], [hangout(25)]);
  assert.equal(second, null);
});

test("invalid or partial cursors cannot be used", () => {
  for (const raw of [
    "{}",
    "null",
    JSON.stringify({
      dmTime: "bad",
      dmGeneration: id(1),
      hangoutId: null,
      dmDone: false,
      hangoutDone: false,
    }),
    JSON.stringify({
      dmTime: null,
      dmGeneration: id(1),
      hangoutId: null,
      dmDone: false,
      hangoutDone: false,
    }),
  ])
    assert.equal(parseCombinedCursor(raw), null);
});

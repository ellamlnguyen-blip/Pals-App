import assert from "node:assert/strict";
import test from "node:test";
import {
  hiddenRows,
  nextFriendshipCursor,
  validFriendshipRows,
} from "./hidden-friendships-page.ts";

const id = (index) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const row = (index) => ({
  peer_id: id(index),
  generation_id: id(index + 100),
  state: "pending",
  direction: "outgoing",
});

test("owner page keeps a cursor even when no hidden relationship is on this page", () => {
  const rows = validFriendshipRows(
    Array.from({ length: 24 }, (_, index) => row(index)),
  );
  assert.equal(rows.length, 24);
  assert.equal(nextFriendshipCursor(rows), id(23));
  assert.deepEqual(
    hiddenRows(
      rows,
      rows.map((item) => ({
        data: [{ account_id: item.peer_id }],
        error: null,
      })),
    ),
    [],
  );
});

test("hidden owner relationships reveal only the original neutral row", () => {
  const rows = [row(1), row(2)];
  assert.deepEqual(
    hiddenRows(rows, [
      { data: [], error: null },
      {
        data: [{ account_id: rows[1].peer_id, real_name: "Visible" }],
        error: null,
      },
    ]),
    [rows[0]],
  );
  assert.equal(
    hiddenRows(rows, [
      { data: [], error: null },
      { data: null, error: "denied" },
    ]),
    null,
  );
  assert.equal(
    hiddenRows(rows, [
      { data: [], error: null },
      { data: [{ account_id: id(3) }], error: null },
    ]),
    null,
  );
  assert.equal(validFriendshipRows([{ ...row(1), peer_id: "bad" }]), null);
});

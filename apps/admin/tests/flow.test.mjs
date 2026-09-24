import test from "node:test";
import assert from "node:assert/strict";
import {
  deniedView,
  duplicateCandidates,
  mutationBody,
  nextCursor,
  responseBelongsTo,
  scheduleSelectedFocus,
} from "../lib/flow.ts";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
const C = "00000000-0000-4000-8000-000000000003";
const row = (report_id, submitted_at, target_id = C, target_type = "user") => ({
  report_id,
  submitted_at,
  target_id,
  target_type,
});

test("authority denial has no retained queue, detail, selection, or pending action", () => {
  assert.deepEqual(deniedView(), {
    queue: [],
    history: [],
    detail: null,
    selected: null,
    uncertain: null,
    denied: true,
  });
});

test("rapid A to B selection discards A detail and a late A mutation denial", () => {
  const a = { generation: 5, session: 2, reportId: A };
  assert.equal(
    responseBelongsTo(a, { generation: 6, session: 2, reportId: B }),
    false,
  );
  assert.equal(
    responseBelongsTo(a, { generation: 5, session: 3, reportId: A }),
    false,
  );
  assert.equal(responseBelongsTo(a, a), true);
});

test("same-key retry preserves report, revision, request ID, and exact payload", () => {
  const intent = {
    op: "hangout",
    reportId: A,
    requestId: B,
    revision: 7,
    reason: "Reviewed evidence",
    action: "disable",
  };
  const first = mutationBody(intent);
  const retry = mutationBody(intent);
  assert.deepEqual(retry, first);
  assert.deepEqual(Object.keys(first), [
    "op",
    "reportId",
    "requestId",
    "revision",
    "reason",
  ]);
  assert.equal(first.requestId, B);
  assert.equal(first.revision, 7);
});

test("queue cursor uses the server page tail and never advances a short page", () => {
  const queue = Array.from({ length: 24 }, (_, i) =>
    row(
      `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`,
      new Date(Date.UTC(2026, 8, 24, 0, 0, 24 - i)).toISOString(),
    ),
  );
  assert.deepEqual(nextCursor(queue), {
    afterAt: queue[23].submitted_at,
    afterId: queue[23].report_id,
  });
  assert.equal(nextCursor(queue.slice(0, 23)), null);
});

test("duplicate choices are earlier, reviewable items for the same stored target", () => {
  const detail = row(B, "2026-09-24T12:00:00Z");
  const choices = duplicateCandidates(
    [
      row(A, "2026-09-24T11:00:00Z"),
      row(C, "2026-09-24T13:00:00Z"),
      row(B, "2026-09-24T12:00:00Z"),
      row(C, "2026-09-24T11:00:00Z", A),
      row(C, "2026-09-24T11:00:00Z", C, "hangout"),
    ],
    detail,
  );
  assert.deepEqual(
    choices.map((q) => q.report_id),
    [A],
  );
});

test("detail focus follows only the still-selected report", () => {
  let selected = A;
  let callback;
  let focused = 0;
  scheduleSelectedFocus(
    A,
    () => selected,
    () => {
      focused++;
    },
    (fn) => {
      callback = fn;
    },
  );
  selected = B;
  callback();
  assert.equal(focused, 0);
  scheduleSelectedFocus(
    B,
    () => selected,
    () => {
      focused++;
    },
    (fn) => {
      callback = fn;
    },
  );
  callback();
  assert.equal(focused, 1);
});

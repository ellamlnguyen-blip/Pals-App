import assert from "node:assert/strict";
import test from "node:test";
import {
  projectDmRow,
  sortCombinedPage,
} from "../apps/web/app/chats/combined-projection.ts";

const peer = "00000000-0000-4000-8000-000000000001";
const generation = "00000000-0000-4000-8000-000000000002";
const raw = {
  peer_id: peer,
  generation_id: generation,
  created_at: "2026-10-15T10:00:00Z",
  direction: "incoming",
  state: "pending",
  first_body: "private first message",
};

test("DM identity and preview require exact current detail identity", () => {
  const visible = projectDmRow(
    raw,
    { account_id: peer, real_name: "A Student" },
    7,
  );
  assert.equal(visible.name, "A Student");
  assert.equal(visible.dm.first_body, "private first message");
  assert.equal(visible.photoRevision, 7);
  for (const detail of [
    null,
    { account_id: generation, real_name: "Wrong person" },
    { account_id: peer, real_name: "" },
  ]) {
    const hidden = projectDmRow(raw, detail, 7);
    assert.equal(hidden.name, null);
    assert.equal(hidden.dm.first_body, null);
    assert.equal(hidden.photoRevision, null);
  }
});

test("malformed source rows are never projected", () => {
  for (const changed of [
    { peer_id: "bad" },
    { state: "unknown" },
    { first_body: { body: "private" } },
    { created_at: "bad" },
  ])
    assert.equal(
      projectDmRow(
        { ...raw, ...changed },
        { account_id: peer, real_name: "A Student" },
        null,
      ),
      null,
    );
});

test("combined page mixes sources by source creation time with deterministic ties", () => {
  const direct = projectDmRow(
    raw,
    { account_id: peer, real_name: "A Student" },
    null,
  );
  const hangout = {
    kind: "hangout",
    id: peer,
    title: "Tacos",
    emoji: "🌮",
    startsAt: "2026-10-20T10:00:00Z",
    entryTime: "2026-10-15T11:00:00Z",
  };
  assert.deepEqual(
    sortCombinedPage([direct, hangout]).map((row) => row.kind),
    ["hangout", "dm"],
  );
  assert.equal(raw.first_body, "private first message");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAttentionPage,
  projectAttentionItem,
} from "./combined-projection.ts";

const dm = {
  source_kind: "dm",
  source_id: "11111111-1111-4111-8111-111111111111",
  peer_id: "22222222-2222-4222-8222-222222222222",
  direction: "incoming",
  state: "accepted",
  label: null,
  sort_time: "2026-10-15T12:00:00Z",
  has_unread: true,
};
const hangout = {
  source_kind: "hangout",
  source_id: "33333333-3333-4333-8333-333333333333",
  peer_id: null,
  direction: null,
  state: "joined",
  label: "Tacos at noon",
  sort_time: "2026-10-15T11:00:00Z",
  has_unread: false,
};

test("opaque attention page preserves global server order and unread state", () => {
  const parsed = parseAttentionPage({
    items: [dm, hangout],
    has_more: true,
    next_cursor: "opaque.token",
  });
  assert.ok(parsed);
  assert.deepEqual(
    parsed.items.map((item) => item.source_kind),
    ["dm", "hangout"],
  );
  const peer = { account_id: dm.peer_id, real_name: "Avery Hill" };
  assert.deepEqual(
    projectAttentionItem(parsed.items[0], peer, 4)?.hasUnread,
    true,
  );
  assert.equal(projectAttentionItem(parsed.items[1], null, null)?.emoji, "🌮");
});

test("missing People detail keeps safe source metadata without label, photo or unread", () => {
  const generic = projectAttentionItem(dm, null, 42);
  assert.equal(generic?.kind, "dm");
  assert.equal(generic?.name, null);
  assert.equal(generic?.photoRevision, null);
  assert.equal(generic?.hasUnread, false);
  assert.equal(generic?.dm.generation_id, dm.source_id);
  assert.equal(generic?.dm.first_body, null);
  assert.equal(
    projectAttentionItem(dm, { account_id: dm.peer_id }, 42)?.name,
    null,
  );
});

test("invalid shape and mismatched fresh peer detail fail closed", () => {
  assert.equal(
    parseAttentionPage({
      items: [{ ...dm, has_unread: 1 }],
      has_more: false,
      next_cursor: null,
    }),
    null,
  );
  assert.equal(
    parseAttentionPage({ items: [dm], has_more: true, next_cursor: null }),
    null,
  );
  assert.equal(
    projectAttentionItem(
      dm,
      { account_id: hangout.source_id, real_name: "Stale" },
      null,
    ),
    null,
  );
});

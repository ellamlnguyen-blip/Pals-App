import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchVisiblePage,
  nextPageCursors,
} from "../apps/web/app/chats/hangouts/[id]/page-data.ts";

test("visible chat paging makes one bounded request per page and can return", async () => {
  const calls = [];
  let departed = false;
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const after = Number(
      new URL(url, "http://localhost").searchParams.get("after") ?? 0,
    );
    const rows = Array.from({ length: 120 }, (_, i) => ({
      message_id: String(i + 1),
      sequence: i + 1,
      body: `Message ${i + 1}`,
      created_at: "2026-09-23T12:00:00Z",
      mine: false,
      author_id: departed ? null : "peer-id",
      author_label: departed ? "Former participant" : null,
    }));
    return {
      status: 200,
      json: async () => ({
        kind: "ok",
        messages: rows.filter((row) => row.sequence > after).slice(0, 50),
      }),
    };
  };

  let cursors = [null];
  const first = await fetchVisiblePage(
    "/api/chat/hangout",
    "actor-id",
    cursors[0],
    fetcher,
  );
  assert.equal(calls.length, 1, "a visible poll does not walk later pages");
  assert.equal(first.data.messages.length, 50);
  assert.equal(first.data.messages.at(-1).sequence, 50);
  assert.equal(calls[0].options.headers["x-pals-chat-actor"], "actor-id");
  assert.equal(calls[0].options.cache, "no-store");

  cursors = nextPageCursors(cursors, 0, 50);
  const second = await fetchVisiblePage(
    "/api/chat/hangout",
    "actor-id",
    cursors[1],
    fetcher,
  );
  assert.equal(calls.length, 2);
  assert.equal(second.data.messages[0].sequence, 51);
  assert.equal(second.data.messages.at(-1).sequence, 100);

  departed = true;
  const refreshed = await fetchVisiblePage(
    "/api/chat/hangout",
    "actor-id",
    cursors[1],
    fetcher,
  );
  assert.equal(
    calls.length,
    3,
    "author reprojection rereads only the displayed page",
  );
  assert.equal(refreshed.data.messages.length, 50);
  assert.equal(refreshed.data.messages[0].author_id, null);
  assert.equal(refreshed.data.messages[0].author_label, "Former participant");

  const previous = await fetchVisiblePage(
    "/api/chat/hangout",
    "actor-id",
    cursors[0],
    fetcher,
  );
  assert.equal(previous.data.messages[0].sequence, 1);
  assert.equal(previous.data.messages.at(-1).sequence, 50);
  cursors = nextPageCursors(cursors, 0, 50);
  assert.deepEqual(
    cursors,
    [null, 50],
    "going back trims the old forward branch",
  );
});

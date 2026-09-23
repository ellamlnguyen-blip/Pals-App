import test from "node:test";
import assert from "node:assert/strict";
import { notificationDestination } from "../apps/web/lib/notification-destination.ts";
const actor = "11111111-1111-4111-8111-111111111111";
const target = "22222222-2222-4222-8222-222222222222";
const row = (event_code, source_kind, changes = {}) => ({
  notification_id: "33333333-3333-4333-8333-333333333333",
  source_id: target,
  actor_id: actor,
  target_id: target,
  event_code,
  source_kind,
  label: "Generic",
  created_at: "2026-09-23T10:00:00Z",
  read_at: null,
  ...changes,
});
test("every supported event uses only its allowlisted destination", () => {
  for (const code of ["friend_request", "friend_accepted"])
    assert.deepEqual(notificationDestination(row(code, "friendship")), {
      href: "/people/friends",
      label: "View friendships",
    });
  for (const code of ["dm_request", "dm_accepted", "dm_message"])
    assert.deepEqual(notificationDestination(row(code, "dm")), {
      href: `/chats/direct/${actor}`,
      label: "Open chat",
    });
  assert.deepEqual(
    notificationDestination(
      row("hangout_chat_message", "hangout_chat", { actor_id: null }),
    ),
    { href: `/chats/hangouts/${target}`, label: "Open Hangout chat" },
  );
  for (const code of [
    "hangout_edited",
    "hangout_cancelled",
    "hangout_joined",
    "hangout_left",
  ])
    assert.deepEqual(
      notificationDestination(row(code, "hangout", { actor_id: null })),
      { href: `/hangouts/saved/${target}`, label: "View Hangout" },
    );
});
test("unavailable or inconsistent source details never become a destination", () => {
  assert.equal(
    notificationDestination(
      row(null, null, {
        label: "Unavailable",
        actor_id: null,
        target_id: null,
      }),
    ),
    null,
  );
  assert.equal(
    notificationDestination(row("dm_message", "dm", { actor_id: null })),
    null,
  );
  assert.equal(
    notificationDestination(
      row("dm_message", "dm", { actor_id: "https://evil.test" }),
    ),
    null,
  );
  assert.equal(
    notificationDestination(row("hangout_edited", "friendship")),
    null,
  );
  assert.equal(notificationDestination(row("unknown", "hangout")), null);
});

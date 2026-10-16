import assert from "node:assert/strict";
import test from "node:test";
import {
  friendRequestFromNotification,
  notificationDestination,
} from "./notification-destination.ts";

const ids = {
  source: "11111111-1111-4111-8111-111111111111",
  target: "22222222-2222-4222-8222-222222222222",
  actor: "33333333-3333-4333-8333-333333333333",
};
const row = (override = {}) => ({
  notification_id: "44444444-4444-4444-8444-444444444444",
  source_kind: "hangout_activity",
  source_id: ids.source,
  target_id: ids.target,
  actor_id: null,
  label: "New campus Hangout",
  event_code: "campus_new_hangout",
  created_at: new Date().toISOString(),
  read_at: null,
  ...override,
});

test("new activity and reminder codes route only valid source backed Hangouts", () => {
  for (const code of [
    "campus_new_hangout",
    "friend_created_hangout",
    "friend_joined_hangout",
  ]) {
    assert.deepEqual(notificationDestination(row({ event_code: code })), {
      href: `/hangouts/saved/${ids.target}`,
      label: "View Hangout",
    });
    assert.equal(
      notificationDestination(
        row({ event_code: code, source_kind: "hangout" }),
      ),
      null,
    );
  }
  assert.deepEqual(
    notificationDestination(
      row({
        source_kind: "hangout_reminder",
        event_code: "hangout_start_reminder",
      }),
    ),
    { href: `/hangouts/saved/${ids.target}`, label: "View Hangout" },
  );
  assert.equal(
    notificationDestination(
      row({
        source_kind: "hangout_reminder",
        event_code: "hangout_start_reminder",
        target_id: "invalid",
      }),
    ),
    null,
  );
  assert.equal(notificationDestination(row({ label: "Unavailable" })), null);
});

test("friend action carries the exact notification generation", () => {
  const request = row({
    source_kind: "friendship",
    source_id: ids.source,
    target_id: ids.source,
    actor_id: ids.actor,
    event_code: "friend_request",
    label: "Friend request",
  });
  assert.deepEqual(notificationDestination(request), {
    href: `/people/${ids.actor}`,
    label: "View Pal",
  });
  assert.deepEqual(friendRequestFromNotification(request), {
    peerId: ids.actor,
    generationId: ids.source,
  });
  assert.equal(
    friendRequestFromNotification({ ...request, target_id: ids.target }),
    null,
  );
  assert.equal(
    friendRequestFromNotification({ ...request, label: "Unavailable" }),
    null,
  );
  assert.equal(
    friendRequestFromNotification({
      ...request,
      event_code: "friend_accepted",
    }),
    null,
  );
});

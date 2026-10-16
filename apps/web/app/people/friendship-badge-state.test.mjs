import assert from "node:assert/strict";
import test from "node:test";
import { friendshipBadgeForPeer } from "./friendship-badge-state.ts";

const peer = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

test("badges require an exact authorized relationship", () => {
  assert.equal(
    friendshipBadgeForPeer(peer, { peer_id: peer, state: "accepted" }),
    "friend",
  );
  assert.equal(
    friendshipBadgeForPeer(peer, {
      peer_id: peer,
      state: "pending",
      direction: "outgoing",
    }),
    "outgoing",
  );
  assert.equal(
    friendshipBadgeForPeer(peer, {
      peer_id: peer,
      state: "pending",
      direction: "incoming",
    }),
    null,
  );
  assert.equal(
    friendshipBadgeForPeer(peer, { peer_id: other, state: "accepted" }),
    null,
  );
  assert.equal(friendshipBadgeForPeer(peer, null), null);
});

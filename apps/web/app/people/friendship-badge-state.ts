const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export type FriendshipBadgeStatus = "friend" | "outgoing" | null;

/** Only a current, exact peer projection may decorate a visible profile. */
export function friendshipBadgeForPeer(
  peerId: string,
  row: unknown,
): FriendshipBadgeStatus {
  if (!uuid.test(peerId) || !row || typeof row !== "object") return null;
  const relationship = row as Record<string, unknown>;
  if (relationship.peer_id !== peerId) return null;
  if (relationship.state === "accepted") return "friend";
  if (relationship.state === "pending" && relationship.direction === "outgoing")
    return "outgoing";
  return null;
}

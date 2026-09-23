export type NotificationRow = {
  notification_id: string;
  source_kind: string | null;
  source_id: string | null;
  event_code: string | null;
  actor_id: string | null;
  target_id: string | null;
  label: string;
  created_at: string;
  read_at: string | null;
};
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function notificationDestination(
  row: NotificationRow,
): { href: string; label: string } | null {
  if (row.label === "Unavailable" || !row.event_code) return null;
  switch (row.event_code) {
    case "friend_request":
    case "friend_accepted":
      return row.source_kind === "friendship" &&
        row.actor_id &&
        uuid.test(row.actor_id) &&
        row.target_id &&
        uuid.test(row.target_id)
        ? { href: "/people/friends", label: "View friendships" }
        : null;
    case "dm_request":
    case "dm_accepted":
    case "dm_message":
      return row.source_kind === "dm" &&
        row.actor_id &&
        uuid.test(row.actor_id) &&
        row.target_id &&
        uuid.test(row.target_id)
        ? { href: `/chats/direct/${row.actor_id}`, label: "Open chat" }
        : null;
    case "hangout_chat_message":
      return row.source_kind === "hangout_chat" &&
        row.target_id &&
        uuid.test(row.target_id)
        ? {
            href: `/chats/hangouts/${row.target_id}`,
            label: "Open Hangout chat",
          }
        : null;
    case "hangout_edited":
    case "hangout_cancelled":
    case "hangout_joined":
    case "hangout_left":
      return row.source_kind === "hangout" &&
        row.target_id &&
        uuid.test(row.target_id)
        ? { href: `/hangouts/saved/${row.target_id}`, label: "View Hangout" }
        : null;
    default:
      return null;
  }
}

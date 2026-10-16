import type { Friendship } from "../friend-actions";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function validFriendshipRows(value: unknown): Friendship[] | null {
  if (!Array.isArray(value) || value.length > 24) return null;
  if (
    value.some(
      (row) =>
        !row ||
        typeof row !== "object" ||
        !uuid.test(row.peer_id) ||
        !uuid.test(row.generation_id) ||
        !["accepted", "pending"].includes(row.state) ||
        !["incoming", "outgoing"].includes(row.direction),
    )
  )
    return null;
  return value as Friendship[];
}

export function hiddenRows(
  rows: Friendship[],
  details: { data: unknown; error: unknown }[],
): Friendship[] | null {
  if (details.length !== rows.length) return null;
  const result: Friendship[] = [];
  for (let index = 0; index < rows.length; index++) {
    const detail = details[index];
    if (detail.error || !Array.isArray(detail.data) || detail.data.length > 1)
      return null;
    if (detail.data.length === 0) result.push(rows[index]);
    else if (detail.data[0]?.account_id !== rows[index].peer_id) return null;
  }
  return result;
}

export function nextFriendshipCursor(rows: Friendship[]) {
  return rows.length === 24 ? rows[23].peer_id : null;
}

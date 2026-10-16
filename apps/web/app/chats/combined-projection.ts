import type { CombinedRow } from "./combined-types.ts";
import type { DmInboxRow } from "../../lib/dm";
import { pinCue } from "../hangouts/saved/pin-cue.ts";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export type AttentionItem = {
  source_kind: "dm" | "hangout";
  source_id: string;
  peer_id: string | null;
  direction: "incoming" | "outgoing" | null;
  state: "accepted" | "joined" | null;
  label: string | null;
  sort_time: string;
  has_unread: boolean;
};

/** Walk complete source pages so a category never skips a mixed-page item. */
export async function readCategoryPage(
  cursor: string | null,
  category: "dm" | "hangout" | null,
  read: (cursor: string | null) => Promise<unknown>,
  batchLimit = 8,
) {
  let next = cursor;
  for (let batch = 0; batch < batchLimit; batch++) {
    const page = parseAttentionPage(await read(next));
    if (!page) return null;
    next = page.next_cursor;
    const items = category
      ? page.items.filter((item) => item.source_kind === category)
      : page.items;
    if (items.length || !next || !category) return { items, next };
  }
  return { items: [] as AttentionItem[], next };
}

export function parseAttentionPage(raw: unknown): {
  items: AttentionItem[];
  has_more: boolean;
  next_cursor: string | null;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const page = raw as Record<string, unknown>;
  if (
    !Array.isArray(page.items) ||
    typeof page.has_more !== "boolean" ||
    (page.next_cursor !== null &&
      (typeof page.next_cursor !== "string" ||
        page.next_cursor.length > 160)) ||
    page.has_more !== (page.next_cursor !== null) ||
    page.items.length > 24
  )
    return null;
  const items: AttentionItem[] = [];
  for (const value of page.items) {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    if (
      (item.source_kind !== "dm" && item.source_kind !== "hangout") ||
      typeof item.source_id !== "string" ||
      !uuid.test(item.source_id) ||
      typeof item.sort_time !== "string" ||
      !Number.isFinite(Date.parse(item.sort_time)) ||
      typeof item.has_unread !== "boolean" ||
      (item.peer_id !== null &&
        (typeof item.peer_id !== "string" || !uuid.test(item.peer_id))) ||
      (item.label !== null && typeof item.label !== "string") ||
      (item.direction !== null &&
        item.direction !== "incoming" &&
        item.direction !== "outgoing") ||
      (item.state !== null &&
        item.state !== "accepted" &&
        item.state !== "joined")
    )
      return null;
    if (
      (item.source_kind === "dm" &&
        (!item.peer_id || !item.direction || item.state !== "accepted")) ||
      (item.source_kind === "hangout" &&
        (!item.label ||
          item.peer_id !== null ||
          item.direction !== null ||
          item.state !== "joined"))
    )
      return null;
    items.push(item as unknown as AttentionItem);
  }
  return {
    items,
    has_more: page.has_more,
    next_cursor: page.next_cursor as string | null,
  };
}

export function projectAttentionItem(
  item: AttentionItem,
  detail: unknown,
  revision: number | null,
): CombinedRow | null {
  if (item.source_kind === "hangout") {
    const title = item.label?.trim();
    if (!title) return null;
    return {
      kind: "hangout",
      id: item.source_id,
      title,
      emoji: pinCue({ title, description: null }),
      entryTime: item.sort_time,
      hasUnread: item.has_unread,
    };
  }
  const peer =
    detail && typeof detail === "object"
      ? (detail as Record<string, unknown>)
      : null;
  if (peer && peer.account_id !== item.peer_id) return null;
  const name =
    peer && typeof peer.real_name === "string" && peer.real_name.trim()
      ? peer.real_name
      : null;
  const dm: DmInboxRow = {
    peer_id: item.peer_id!,
    generation_id: item.source_id,
    created_at: item.sort_time,
    direction: item.direction as "incoming" | "outgoing",
    state: "accepted",
    first_body: null,
  };
  return {
    kind: "dm",
    dm,
    name,
    photoRevision: name ? revision : null,
    entryTime: item.sort_time,
    hasUnread: name ? item.has_unread : false,
  };
}

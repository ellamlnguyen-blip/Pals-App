import type { CombinedRow } from "./combined-types.ts";
import type { DmInboxRow } from "../../lib/dm";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function projectDmRow(
  raw: unknown,
  detail: unknown,
  revision: number | null,
): Extract<CombinedRow, { kind: "dm" }> | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (
    typeof row.peer_id !== "string" ||
    !uuid.test(row.peer_id) ||
    typeof row.generation_id !== "string" ||
    !uuid.test(row.generation_id) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at)) ||
    (row.direction !== "incoming" && row.direction !== "outgoing") ||
    (row.state !== "pending" && row.state !== "accepted") ||
    (row.first_body !== null && typeof row.first_body !== "string")
  )
    return null;
  const candidate =
    detail && typeof detail === "object"
      ? (detail as Record<string, unknown>)
      : null;
  const name =
    candidate?.account_id === row.peer_id &&
    typeof candidate.real_name === "string" &&
    candidate.real_name.trim()
      ? candidate.real_name
      : null;
  const dm: DmInboxRow = {
    peer_id: row.peer_id,
    generation_id: row.generation_id,
    created_at: row.created_at,
    direction: row.direction as DmInboxRow["direction"],
    state: row.state as DmInboxRow["state"],
    first_body:
      name && row.state === "pending" && row.direction === "incoming"
        ? row.first_body
        : null,
  };
  return {
    kind: "dm",
    dm,
    name,
    photoRevision: name ? revision : null,
    entryTime: row.created_at,
  };
}

/** Source creation time only. There is no authorized latest-message or joined-at projection. */
export function sortCombinedPage(rows: CombinedRow[]): CombinedRow[] {
  return [...rows].sort((a, b) => {
    const byTime = Date.parse(b.entryTime) - Date.parse(a.entryTime);
    if (byTime) return byTime;
    const aId = a.kind === "dm" ? a.dm.generation_id : a.id;
    const bId = b.kind === "dm" ? b.dm.generation_id : b.id;
    return bId.localeCompare(aId);
  });
}

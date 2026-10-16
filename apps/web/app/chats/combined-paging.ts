import type { DmInboxRow } from "../../lib/dm";
import type { CombinedCursor } from "./combined-types.ts";
import { firstCursor } from "./combined-types.ts";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function parseCombinedCursor(raw: string | null): CombinedCursor | null {
  if (!raw) return firstCursor;
  if (raw.length > 512) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const c = value as Record<string, unknown>;
    if (
      (c.dmTime !== null &&
        (typeof c.dmTime !== "string" ||
          !Number.isFinite(Date.parse(c.dmTime)))) ||
      (c.dmGeneration !== null &&
        (typeof c.dmGeneration !== "string" || !uuid.test(c.dmGeneration))) ||
      (c.dmTime === null) !== (c.dmGeneration === null) ||
      (c.hangoutId !== null &&
        (typeof c.hangoutId !== "string" || !uuid.test(c.hangoutId))) ||
      typeof c.dmDone !== "boolean" ||
      typeof c.hangoutDone !== "boolean"
    )
      return null;
    return c as CombinedCursor;
  } catch {
    return null;
  }
}

export function advanceCombinedCursor(
  cursor: CombinedCursor,
  dms: DmInboxRow[],
  hangouts: { hangout_id: string }[],
): CombinedCursor | null {
  const lastDm = dms.at(-1),
    lastHangout = hangouts.at(-1);
  const next: CombinedCursor = {
    dmTime: lastDm?.created_at ?? cursor.dmTime,
    dmGeneration: lastDm?.generation_id ?? cursor.dmGeneration,
    hangoutId: lastHangout?.hangout_id ?? cursor.hangoutId,
    dmDone: cursor.dmDone || dms.length < 24,
    hangoutDone: cursor.hangoutDone || hangouts.length < 24,
  };
  return next.dmDone && next.hangoutDone ? null : next;
}

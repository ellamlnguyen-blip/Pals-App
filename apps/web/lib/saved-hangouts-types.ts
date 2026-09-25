export const UNC_BOUNDS = {
  west: -79.13,
  south: 35.85,
  east: -78.98,
  north: 35.97,
};
export function validSavedHangoutId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
  );
}
export type Bounds = typeof UNC_BOUNDS;
export type SavedFilter = { time: "upcoming" | "all"; joining: "any" | "open" };
export type SavedPin = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  public_place: string;
  public_latitude: number;
  public_longitude: number;
  campus_zone: string | null;
  joining_state: string;
};
export type SavedDetail = SavedPin & {
  host_id: string;
  status: string;
  revision: number;
};
export type ParticipantState =
  "host" | "joined" | "left" | "removed" | "none" | "unknown";

// A Hangout revision does not cover every roster visibility transition
// (for example, a block can remove a visible ID without changing it).
export function sameVisiblePage(
  first: readonly { account_id: string; role_label?: string }[],
  second: readonly { account_id: string; role_label?: string }[],
) {
  return (
    first.length === second.length &&
    first.every(
      (row, index) =>
        row.account_id === second[index].account_id &&
        row.role_label === second[index].role_label,
    )
  );
}

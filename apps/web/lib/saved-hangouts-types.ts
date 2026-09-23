export const UNC_BOUNDS = {
  west: -79.13,
  south: 35.85,
  east: -78.98,
  north: 35.97,
};
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

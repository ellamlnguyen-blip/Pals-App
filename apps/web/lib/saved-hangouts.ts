import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { access } from "./access";
import { requireLocalHangouts } from "./hangouts";
import {
  UNC_BOUNDS,
  validSavedHangoutId,
  type Bounds,
  type SavedFilter,
  type SavedPin,
  type SavedDetail,
  type ParticipantState,
} from "./saved-hangouts-types";

const pinFields =
  "id,title,description,starts_at,ends_at,public_place,public_latitude,public_longitude,campus_zone,joining_state";
const detailFields = `${pinFields},host_id,status,revision`;
type RankingMode = "small_first" | "chronological";
type Projection = {
  pins: SavedPin[];
  epoch: string;
  ranking_mode: RankingMode;
};
const pinKeys = pinFields.split(",").sort();

function parseProjection(value: unknown): Projection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join(",") !== "epoch,pins,ranking_mode" ||
    typeof row.epoch !== "string" ||
    !validSavedHangoutId(row.epoch) ||
    (row.ranking_mode !== "small_first" &&
      row.ranking_mode !== "chronological") ||
    !Array.isArray(row.pins) ||
    row.pins.length > 101
  )
    return null;
  for (const pin of row.pins) {
    if (!pin || typeof pin !== "object" || Array.isArray(pin)) return null;
    const fields = pin as Record<string, unknown>;
    if (
      Object.keys(fields).sort().join(",") !== pinKeys.join(",") ||
      typeof fields.id !== "string" ||
      !validSavedHangoutId(fields.id) ||
      typeof fields.title !== "string" ||
      (fields.description !== null && typeof fields.description !== "string") ||
      typeof fields.starts_at !== "string" ||
      (fields.ends_at !== null && typeof fields.ends_at !== "string") ||
      typeof fields.public_place !== "string" ||
      !Number.isFinite(fields.public_latitude) ||
      !Number.isFinite(fields.public_longitude) ||
      (fields.campus_zone !== null && typeof fields.campus_zone !== "string") ||
      (fields.joining_state !== "open" && fields.joining_state !== "closed")
    )
      return null;
  }
  return row as Projection;
}

function validBounds(value: Bounds): boolean {
  return (
    !!value &&
    [value.west, value.south, value.east, value.north].every(Number.isFinite) &&
    value.west >= UNC_BOUNDS.west &&
    value.east <= UNC_BOUNDS.east &&
    value.south >= UNC_BOUNDS.south &&
    value.north <= UNC_BOUNDS.north &&
    value.west < value.east &&
    value.south < value.north
  );
}

export async function querySaved(bounds: Bounds, filters: SavedFilter) {
  const cutoff = new Date().toISOString();
  requireLocalHangouts();
  if (
    !validBounds(bounds) ||
    !filters ||
    !["upcoming", "all"].includes(filters.time) ||
    !["any", "open"].includes(filters.joining)
  )
    return {
      kind: "invalid" as const,
      items: [] as SavedPin[],
      truncated: false,
    };
  const { client, state } = await access();
  if (state !== "ready")
    return {
      kind: "denied" as const,
      items: [] as SavedPin[],
      truncated: false,
    };
  const args = {
    p_west: bounds.west,
    p_south: bounds.south,
    p_east: bounds.east,
    p_north: bounds.north,
    p_time_filter: filters.time,
    p_joining_filter: filters.joining,
    p_cutoff: cutoff,
  };
  const first = await client.rpc("query_saved_hangouts", args);
  const initial = parseProjection(first.data);
  if (first.error || !initial)
    return {
      kind:
        first.error?.code === "42501"
          ? ("denied" as const)
          : ("error" as const),
      items: [] as SavedPin[],
      truncated: false,
    };
  // A fresh caller check separates the two identical, source-authorized reads.
  const { data: live, error: liveError } = await client.rpc("get_access_state");
  if (liveError || live !== "ready")
    return {
      kind: "denied" as const,
      items: [] as SavedPin[],
      truncated: false,
    };
  const second = await client.rpc("query_saved_hangouts", args);
  const verified = parseProjection(second.data);
  if (
    second.error ||
    !verified ||
    initial.epoch !== verified.epoch ||
    initial.ranking_mode !== verified.ranking_mode ||
    JSON.stringify(initial.pins) !== JSON.stringify(verified.pins)
  )
    return {
      kind: "error" as const,
      items: [] as SavedPin[],
      truncated: false,
    };
  return {
    kind: "ok" as const,
    items: verified.pins.slice(0, 100),
    truncated: verified.pins.length > 100,
    rankingMode: verified.ranking_mode,
  };
}

export async function readSavedPublic(
  client: SupabaseClient,
  id: string,
): Promise<SavedDetail | null> {
  if (!validSavedHangoutId(id)) return null;
  const { data, error } = await client
    .from("hangouts")
    .select(detailFields)
    .eq("id", id)
    .maybeSingle();
  return error ? null : (data as SavedDetail | null);
}

export async function readOwnState(
  client: SupabaseClient,
  id: string,
  userId: string,
  publicRecord: SavedDetail,
): Promise<ParticipantState> {
  if (publicRecord.host_id === userId) return "host";
  const { data, error } = await client.rpc("get_hangout_participant_state", {
    p_hangout_id: id,
    p_account_id: userId,
  });
  if (!error)
    return data === "joined" || data === "left" || data === "removed"
      ? data
      : "none";
  // First-time callers have no participant row. The RPC denies that probe;
  // only a fresh RLS-authorized public read can establish a safe "none".
  if (error.code !== "42501") return "unknown";
  const fresh = await readSavedPublic(client, id);
  return fresh?.status === "published" ? "none" : "unknown";
}

export async function readSavedDetail(id: string) {
  requireLocalHangouts();
  const { client, user, state } = await access();
  if (!user || state !== "ready") return { kind: "denied" as const };
  const record = await readSavedPublic(client, id);
  if (!record) return { kind: "missing" as const };
  const ownState = await readOwnState(client, id, user.id, record);
  if (ownState === "unknown") return { kind: "denied" as const };
  let roster: string[] = [];
  if (record.status === "published") {
    const { data, error } = await client
      .from("hangout_participants")
      .select("account_id")
      .eq("hangout_id", id)
      .order("account_id");
    if (error) return { kind: "denied" as const };
    roster = (data ?? []).map((row) => row.account_id);
  }
  let instructions: string | null = null;
  if (
    record.status === "published" &&
    (ownState === "host" || ownState === "joined")
  ) {
    const { data, error } = await client
      .from("hangout_private_locations")
      .select("instructions")
      .eq("hangout_id", id)
      .maybeSingle();
    if (error) return { kind: "denied" as const };
    instructions = data?.instructions ?? null;
  }
  let largeState: "large" | "small" | "unavailable" | null = null;
  if (ownState === "host" && record.status === "published") {
    largeState = "unavailable";
    try {
      const size = await client.rpc("get_hangout_large_state", {
        p_hangout_id: id,
      });
      if (
        !size.error &&
        Array.isArray(size.data) &&
        size.data.length === 1 &&
        typeof size.data[0]?.is_large === "boolean"
      )
        largeState = size.data[0].is_large ? "large" : "small";
    } catch {
      // A failed size read is neither a small group nor an access proof.
    }
  }
  // Public, roster, private and host-size reads are separate requests.
  // Recheck all authorization facts after the last awaited read.
  const { data: live, error: liveError } = await client.rpc("get_access_state");
  const latest = await readSavedPublic(client, id);
  if (liveError || live !== "ready" || !latest)
    return { kind: "denied" as const };
  const latestState = await readOwnState(client, id, user.id, latest);
  if (latestState === "unknown") return { kind: "denied" as const };
  if (
    latest.status !== record.status ||
    latest.revision !== record.revision ||
    latestState !== ownState
  )
    return { kind: "changed" as const };
  if (latest.status !== "published") instructions = null;
  return {
    kind: "ok" as const,
    record: latest,
    ownState: latestState,
    roster,
    instructions,
    userId: user.id,
    largeState,
  };
}

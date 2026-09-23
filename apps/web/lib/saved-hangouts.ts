import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { access } from "./access";
import { requireLocalHangouts } from "./hangouts";
import {
  UNC_BOUNDS,
  type Bounds,
  type SavedFilter,
  type SavedPin,
  type SavedDetail,
  type ParticipantState,
} from "./saved-hangouts-types";

const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const pinFields =
  "id,title,description,starts_at,ends_at,public_place,public_latitude,public_longitude,campus_zone,joining_state";
const detailFields = `${pinFields},host_id,status,revision`;

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
  const cutoff = new Date().toISOString();
  function visibleQuery() {
    let query = client
      .from("hangouts")
      .select(pinFields)
      .eq("status", "published")
      .eq("visibility", "campus")
      .gte("public_longitude", bounds.west)
      .lte("public_longitude", bounds.east)
      .gte("public_latitude", bounds.south)
      .lte("public_latitude", bounds.north)
      .order("starts_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(101);
    if (filters.time === "upcoming") query = query.gte("starts_at", cutoff);
    if (filters.joining === "open") query = query.eq("joining_state", "open");
    return query;
  }
  const { data, error } = await visibleQuery();
  if (error)
    return {
      kind: "error" as const,
      items: [] as SavedPin[],
      truncated: false,
    };
  // Verify readiness and RLS visibility again after the public read.
  const { data: live, error: liveError } = await client.rpc("get_access_state");
  if (liveError || live !== "ready")
    return {
      kind: "denied" as const,
      items: [] as SavedPin[],
      truncated: false,
    };
  // Requery the same bounded viewport rather than probing one ID. A
  // cancellation, filter change or gate revocation in any returned row must
  // invalidate the entire response before it reaches the map client.
  const { data: verified, error: verifyError } = await visibleQuery();
  if (
    verifyError ||
    JSON.stringify(verified ?? []) !== JSON.stringify(data ?? [])
  )
    return {
      kind: "error" as const,
      items: [] as SavedPin[],
      truncated: false,
    };
  return {
    kind: "ok" as const,
    items: (verified ?? []).slice(0, 100) as SavedPin[],
    truncated: (verified?.length ?? 0) > 100,
  };
}

export async function readSavedPublic(
  client: SupabaseClient,
  id: string,
): Promise<SavedDetail | null> {
  if (!uuid.test(id)) return null;
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
  // Public, roster and private reads are separate requests. Recheck all
  // authorization facts immediately before rendering any private value.
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
  };
}

"use server";
import { access } from "../../../lib/access";
import { requireLocalHangouts } from "../../../lib/hangouts";
import {
  querySaved,
  readOwnState,
  readSavedPublic,
} from "../../../lib/saved-hangouts";
import type { Bounds, SavedFilter } from "../../../lib/saved-hangouts-types";

export async function searchSaved(bounds: Bounds, filters: SavedFilter) {
  return querySaved(bounds, filters);
}

export async function changeSavedMembership(
  id: string,
  intent: "join" | "leave",
) {
  requireLocalHangouts();
  if (
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id) ||
    !["join", "leave"].includes(intent)
  )
    return {
      kind: "invalid" as const,
      message: "Reload the Hangout and try again.",
    };
  const { client, user, state } = await access();
  if (!user || state !== "ready")
    return {
      kind: "denied" as const,
      message:
        "Your Hangout access is unavailable. Reload after checking your account.",
    };
  const current = await readSavedPublic(client, id);
  if (!current)
    return { kind: "denied" as const, message: "This Hangout is unavailable." };
  const before = await readOwnState(client, id, user.id, current);
  if (
    before === "unknown" ||
    before === "removed" ||
    before === "host" ||
    current.status !== "published" ||
    (intent === "join" && current.joining_state !== "open") ||
    (intent === "leave" && before !== "joined")
  )
    return {
      kind: "denied" as const,
      message: "This action is not available for your current Hangout state.",
    };
  const { error } = await client.rpc(
    intent === "join" ? "join_hangout" : "leave_hangout",
    { p_hangout_id: id },
  );
  // Even after an RPC denial or interrupted response, verify persisted state.
  // A concurrent remove/cancel/revocation must never be shown as success.
  const { data: live, error: liveError } = await client.rpc("get_access_state");
  const latest = await readSavedPublic(client, id);
  const after = latest
    ? await readOwnState(client, id, user.id, latest)
    : "unknown";
  if (
    !liveError &&
    live === "ready" &&
    latest?.status === "published" &&
    after === (intent === "join" ? "joined" : "left") &&
    !error
  ) {
    return {
      kind: "saved" as const,
      message:
        intent === "join"
          ? "You joined this Hangout."
          : "You left this Hangout.",
    };
  }
  if (
    error?.code === "42501" &&
    after !== (intent === "join" ? "joined" : "left")
  )
    return {
      kind: "denied" as const,
      message: "Your Hangout state changed. Reload to see what is available.",
    };
  return {
    kind: "uncertain" as const,
    message:
      "We could not verify the outcome. Reload this Hangout before trying again.",
  };
}

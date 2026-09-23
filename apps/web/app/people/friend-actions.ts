"use server";

import { access } from "../../lib/access";
import { peopleId, requireLocalPeople } from "../../lib/people";

export type Friendship = {
  peer_id: string;
  generation_id: string;
  direction: "incoming" | "outgoing";
  state: "pending" | "accepted";
};
export type FriendshipResult = {
  state: "known" | "unknown" | "unavailable" | "stale";
  relationship: Friendship | null;
  message: string;
};
const unknown = (message: string): FriendshipResult => ({
  state: "unknown",
  relationship: null,
  message,
});
const unavailable = (): FriendshipResult => ({
  state: "unavailable",
  relationship: null,
  message: "Friendship is unavailable. Check your access and reload.",
});
const valid = (id: string) => peopleId.test(id);

async function current(
  client: Awaited<ReturnType<typeof access>>["client"],
  peerId: string,
) {
  try {
    const { data, error } = await client.rpc("get_friendship", {
      p_peer_id: peerId,
    });
    if (error) return null;
    return {
      ok: true as const,
      relationship: (data?.[0] ?? null) as Friendship | null,
    };
  } catch {
    return null;
  }
}

export async function readFriendship(
  peerId: string,
): Promise<FriendshipResult> {
  requireLocalPeople();
  if (!valid(peerId)) return unavailable();
  const { client, state } = await access();
  if (state === "signed_out" || state === "restricted") return unavailable();
  const result = await current(client, peerId);
  if (!result) return unavailable();
  return {
    state: "known",
    relationship: result.relationship,
    message: "Current relationship state loaded.",
  };
}

export async function createFriendRequest(
  peerId: string,
  requestId: string,
): Promise<FriendshipResult> {
  requireLocalPeople();
  if (!valid(peerId) || !valid(requestId)) return unavailable();
  const { client, state } = await access();
  if (state !== "ready") return unavailable();
  const detail = await client.rpc("get_people_detail", {
    p_account_id: peerId,
  });
  if (detail.error || !detail.data?.length) return unavailable();
  const before = await current(client, peerId);
  if (!before) return unavailable();
  if (before.relationship)
    return {
      state: "stale",
      relationship: before.relationship,
      message: "Relationship changed. Reload before another action.",
    };
  let writeOk = false;
  try {
    writeOk = !(
      await client.rpc("create_friend_request", {
        p_target_id: peerId,
        p_request_id: requestId,
      })
    ).error;
  } catch {
    /* Read after uncertain write. */
  }
  const after = await current(client, peerId);
  if (!after)
    return unknown(
      "Request outcome unknown. Reload before trying again with the same request key.",
    );
  if (after.relationship)
    return {
      state: "known",
      relationship: after.relationship,
      message: writeOk
        ? "Current request status is shown."
        : "The request response was uncertain. Current relationship status is shown.",
    };
  return {
    state: "known",
    relationship: null,
    message:
      "No current relationship is visible. This does not confirm whether the request was received. You can retry this same request key.",
  };
}

export type FriendshipTransition = "accept" | "decline" | "cancel" | "unfriend";
export async function changeFriendship(
  peerId: string,
  generationId: string,
  action: FriendshipTransition,
): Promise<FriendshipResult> {
  requireLocalPeople();
  if (
    !valid(peerId) ||
    !valid(generationId) ||
    !["accept", "decline", "cancel", "unfriend"].includes(action)
  )
    return unavailable();
  const { client, state } = await access();
  if (state === "signed_out" || state === "restricted") return unavailable();
  const before = await current(client, peerId);
  if (!before) return unavailable();
  const row = before.relationship;
  const allowed =
    row?.generation_id === generationId &&
    (action === "unfriend"
      ? row.state === "accepted"
      : row.state === "pending" &&
        (action === "cancel"
          ? row.direction === "outgoing"
          : row.direction === "incoming"));
  if (!allowed)
    return {
      state: "stale",
      relationship: row,
      message: "This request changed. Reload its current status before acting.",
    };
  const method = {
    accept: "accept_friend_request",
    decline: "decline_friend_request",
    cancel: "cancel_friend_request",
    unfriend: "unfriend",
  } as const;
  let writeOk = false;
  try {
    writeOk = !(
      await client.rpc(method[action], {
        p_peer_id: peerId,
        p_generation_id: generationId,
      })
    ).error;
  } catch {
    /* Read after uncertain write. */
  }
  const after = await current(client, peerId);
  if (!after) return unknown("Outcome unknown. Reload before another action.");
  return {
    state: writeOk ? "known" : "stale",
    relationship: after.relationship,
    message: writeOk
      ? "Current relationship status is shown."
      : after.relationship
        ? "The action response was uncertain. Current relationship status is shown. Reload before another action."
        : "There is no current relationship. This alone does not prove which action removed it. Reload before another action.",
  };
}

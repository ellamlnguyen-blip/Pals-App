"use server";
import { access } from "../../../lib/access";
import { requireLocalHangouts } from "../../../lib/hangouts";
import {
  querySaved,
  readOwnState,
  readSavedPublic,
} from "../../../lib/saved-hangouts";
import {
  validSavedHangoutId,
  type Bounds,
  type SavedFilter,
} from "../../../lib/saved-hangouts-types";

export async function searchSaved(bounds: Bounds, filters: SavedFilter) {
  return querySaved(bounds, filters);
}

export async function changeSavedJoining(
  id: string,
  expectedRevision: number,
  desired: "open" | "closed",
) {
  requireLocalHangouts();
  const unavailable = {
    kind: "denied" as const,
    message: "Hangout access unavailable. Reload after checking your account.",
  };
  const uncertain = {
    kind: "uncertain" as const,
    message:
      "We could not verify the outcome. Reload this Hangout before trying again.",
  };
  const stale = {
    kind: "stale" as const,
    message: "This Hangout changed. Reload to see the latest joining state.",
  };
  if (
    !validSavedHangoutId(id) ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 1 ||
    (desired !== "open" && desired !== "closed")
  )
    return uncertain;
  let caller;
  try {
    caller = await access();
  } catch {
    return unavailable;
  }
  const { client, user, state } = caller;
  if (!user || state !== "ready") return unavailable;
  let before;
  try {
    before = await readSavedPublic(client, id);
  } catch {
    return unavailable;
  }
  if (!before || before.host_id !== user.id || before.status !== "published")
    return unavailable;
  if (before.revision !== expectedRevision || before.joining_state === desired)
    return stale;

  let nextRevision: unknown;
  let rpcSucceeded = false;
  try {
    const result = await client.rpc("set_hangout_joining", {
      p_hangout_id: id,
      p_expected_revision: expectedRevision,
      p_joining_state: desired,
    });
    nextRevision = result.data;
    rpcSucceeded = !result.error;
  } catch {
    // A lost response cannot establish that this request made the change.
  }
  // Even a successful RPC response is insufficient: verify this caller still
  // has the source and the returned revision now holds the requested state.
  let live;
  let liveError;
  let latest;
  try {
    const accessResult = await client.rpc("get_access_state");
    live = accessResult.data;
    liveError = accessResult.error;
    latest = await readSavedPublic(client, id);
  } catch {
    return unavailable;
  }
  if (
    liveError ||
    live !== "ready" ||
    !latest ||
    latest.host_id !== user.id ||
    latest.status !== "published"
  )
    return unavailable;
  if (
    rpcSucceeded &&
    Number.isSafeInteger(nextRevision) &&
    nextRevision === expectedRevision + 1 &&
    latest.revision === nextRevision &&
    latest.joining_state === desired
  )
    return {
      kind: "saved" as const,
      message: desired === "closed" ? "Joining closed." : "Joining reopened.",
    };
  return uncertain;
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

"use server";

import { access } from "../../../lib/access";
import { requireLocalHangouts } from "../../../lib/hangouts";
import {
  readOwnState,
  readSavedPublic,
  readSavedRole,
} from "../../../lib/saved-hangouts";
import { validSavedHangoutId } from "../../../lib/saved-hangouts-types";

const denied = {
  kind: "denied" as const,
  message: "Management access is unavailable. Reload this Hangout.",
};
const stale = {
  kind: "stale" as const,
  message:
    "This Hangout changed. Review the latest details before trying again.",
};
const uncertain = {
  kind: "uncertain" as const,
  message:
    "The response may have been lost. Reload and review the Hangout before another action.",
};
const validRevision = (value: number) =>
  Number.isSafeInteger(value) && value > 0;
const validId = (value: string) => validSavedHangoutId(value);

export async function managementPage(
  id: string,
  type: "roster" | "assignments",
  after: string | null,
) {
  requireLocalHangouts();
  if (
    !validId(id) ||
    (type !== "roster" && type !== "assignments") ||
    (after !== null && !validId(after))
  )
    return {
      kind: "error" as const,
      rows: [] as { account_id: string; role_label?: string }[],
    };
  const { client, user, state } = await access();
  if (!user || state !== "ready")
    return {
      kind: "denied" as const,
      rows: [] as { account_id: string; role_label?: string }[],
    };
  const source = await readSavedPublic(client, id);
  if (
    !source ||
    source.status !== "published" ||
    (type === "assignments" && source.host_id !== user.id)
  )
    return {
      kind: "denied" as const,
      rows: [] as { account_id: string; role_label?: string }[],
    };
  const result = await client.rpc(
    type === "roster" ? "list_hangout_roster_roles" : "list_hangout_cohosts",
    {
      p_hangout_id: id,
      p_after_account_id: after,
      p_limit: 24,
    },
  );
  if (result.error)
    return {
      kind: "denied" as const,
      rows: [] as { account_id: string; role_label?: string }[],
    };
  const live = await client.rpc("get_access_state");
  const latest = await readSavedPublic(client, id);
  if (
    live.error ||
    live.data !== "ready" ||
    !latest ||
    latest.status !== source.status ||
    latest.revision !== source.revision
  )
    return {
      kind: "denied" as const,
      rows: [] as { account_id: string; role_label?: string }[],
    };
  return {
    kind: "ok" as const,
    rows: result.data ?? [],
    revision: latest.revision,
    more: (result.data?.length ?? 0) === 24,
  };
}

export type ManagementIntent =
  "promote" | "demote" | "step_down" | "remove" | "cancel";
export async function manageHangout(
  id: string,
  expectedRevision: number,
  intent: ManagementIntent,
  target?: string,
) {
  requireLocalHangouts();
  if (
    !validId(id) ||
    !validRevision(expectedRevision) ||
    !["promote", "demote", "step_down", "remove", "cancel"].includes(intent) ||
    ((intent === "promote" || intent === "demote" || intent === "remove") &&
      (!target || !validId(target)))
  )
    return uncertain;
  const { client, user, state } = await access();
  if (!user || state !== "ready") return denied;
  const source = await readSavedPublic(client, id);
  if (!source || source.status !== "published") return denied;
  const ownState = await readOwnState(client, id, user.id, source);
  const ownRole =
    ownState === "host"
      ? "host"
      : ownState === "joined"
        ? await readSavedRole(client, id, user.id)
        : null;
  if (ownRole !== "host" && ownRole !== "cohost") return denied;
  if (ownRole !== "host" && intent !== "remove" && intent !== "step_down")
    return denied;
  if (
    ownRole === "cohost" &&
    intent === "remove" &&
    (!target || (await readSavedRole(client, id, target)) !== "participant")
  )
    return denied;
  if (source.revision !== expectedRevision) return stale;
  const rpcName = {
    promote: "promote_hangout_cohost",
    demote: "demote_hangout_cohost",
    step_down: "step_down_hangout_cohost",
    remove: "remove_hangout_participant",
    cancel: "cancel_hangout",
  }[intent];
  let response: { data: unknown; error: { code?: string } | null } | null =
    null;
  try {
    response = await client.rpc(rpcName, {
      p_hangout_id: id,
      p_expected_revision: expectedRevision,
      ...(target && intent !== "step_down" && intent !== "cancel"
        ? { p_account_id: target }
        : {}),
    });
  } catch {
    // Inspect authoritative state below; never replay the write.
  }
  if (response?.error?.code === "40001") return stale;
  const live = await client.rpc("get_access_state");
  const latest = await readSavedPublic(client, id);
  const afterState = latest
    ? await readOwnState(client, id, user.id, latest)
    : "unknown";
  if (
    live.error ||
    live.data !== "ready" ||
    !latest ||
    afterState === "unknown"
  )
    return denied;
  if (response?.error?.code === "42501") return denied;
  if (response?.error) return uncertain;
  if (
    response &&
    Number.isSafeInteger(response.data) &&
    response.data === expectedRevision + 1 &&
    latest.revision === response.data &&
    (intent !== "cancel" || latest.status === "cancelled") &&
    (intent === "cancel" || latest.status === "published")
  ) {
    return {
      kind: "saved" as const,
      message: "Change saved. The Hangout is refreshing.",
    };
  }
  return uncertain;
}

"use server";

import { access } from "../../../lib/access";
import { localPeopleAvailable, peopleId } from "../../../lib/people";
import {
  hiddenRows,
  nextFriendshipCursor,
  validFriendshipRows,
} from "./hidden-friendships-page";
import type { Friendship } from "../friend-actions";

export type HiddenFriendshipsPage =
  | { kind: "ok"; rows: Friendship[]; next: string | null }
  | { kind: "unavailable" };

/** List only owner relationships whose peer currently has no visible Pals detail. */
export async function readHiddenFriendships(
  after: string | null,
): Promise<HiddenFriendshipsPage> {
  if (!localPeopleAvailable() || (after !== null && !peopleId.test(after)))
    return { kind: "unavailable" };
  try {
    const { client, state, user } = await access();
    if (!user || state === "signed_out" || state === "restricted")
      return { kind: "unavailable" };
    const listed = await client.rpc("list_friendships", {
      p_after_peer_id: after,
      p_limit: 24,
    });
    if (listed.error) return { kind: "unavailable" };
    const rows = validFriendshipRows(listed.data);
    if (!rows) return { kind: "unavailable" };
    // The old owner list did not attempt peer detail reads after readiness loss.
    // Such callers may still manage retained relationships by neutral ID.
    if (state !== "ready")
      return { kind: "ok", rows, next: nextFriendshipCursor(rows) };
    const visibility = await Promise.all(
      rows.map((row) =>
        client.rpc("get_people_detail", { p_account_id: row.peer_id }),
      ),
    );
    const hidden = hiddenRows(rows, visibility);
    if (!hidden) return { kind: "unavailable" };
    return {
      kind: "ok",
      rows: hidden,
      next: nextFriendshipCursor(rows),
    };
  } catch {
    return { kind: "unavailable" };
  }
}

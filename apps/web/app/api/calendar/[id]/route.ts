import { NextResponse } from "next/server";
import { access } from "../../../../lib/access";
import { readSavedDetail } from "../../../../lib/saved-hangouts";
import {
  validSavedHangoutId,
  sameVisiblePage,
} from "../../../../lib/saved-hangouts-types";
import { readRosterIdentities } from "../../../hangouts/saved/[id]/roster-identities";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const unavailable = () =>
  NextResponse.json(
    { kind: "unavailable" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!validSavedHangoutId(id)) return unavailable();
  try {
    const actor = await access();
    if (!actor.user || actor.state !== "ready") return unavailable();
    const before = await readSavedDetail(id);
    if (before.kind !== "ok" || before.userId !== actor.user.id)
      return unavailable();
    const identities =
      before.record.status === "published"
        ? await readRosterIdentities(actor.client, before.roster, actor.user.id)
        : {};
    const after = await readSavedDetail(id);
    const liveIdentities =
      before.record.status === "published" && after.kind === "ok"
        ? await readRosterIdentities(actor.client, after.roster, actor.user.id)
        : {};
    const accessCheck = await actor.client.rpc("get_access_state");
    const finalActor = await access();
    if (
      !finalActor.user ||
      finalActor.user.id !== actor.user.id ||
      finalActor.state !== "ready" ||
      accessCheck.error ||
      accessCheck.data !== "ready" ||
      JSON.stringify(identities) !== JSON.stringify(liveIdentities) ||
      after.kind !== "ok" ||
      after.userId !== actor.user.id ||
      JSON.stringify(before.record) !== JSON.stringify(after.record) ||
      before.ownState !== after.ownState ||
      before.ownRole !== after.ownRole ||
      before.rosterMore !== after.rosterMore ||
      !sameVisiblePage(before.roster, after.roster)
    )
      return unavailable();
    // Public preview projection. readSavedDetail can contain participant-only
    // instructions internally; its object is never serialized to the browser.
    const people = after.roster.slice(0, 24).map((row) => {
      const own = row.account_id === actor.user!.id;
      const identity = identities[row.account_id];
      return {
        role: row.role_label,
        name: own ? "You" : (identity?.name ?? null),
        photo:
          !own && identity?.photoRevision
            ? `/people/${row.account_id}/photo?slot=primary&revision=${identity.photoRevision}`
            : null,
      };
    });
    return NextResponse.json(
      {
        kind: "ok",
        id: after.record.id,
        title: after.record.title,
        description: after.record.description,
        startsAt: after.record.starts_at,
        endsAt: after.record.ends_at,
        publicPlace: after.record.public_place,
        status: after.record.status,
        joining: after.record.joining_state,
        ownState: after.ownState,
        people,
        // The roster reader's cap can also match the exact roster size.
        // This signals a page boundary, not a confirmed additional person.
        rosterPageAtLimit: after.rosterMore,
        canJoin:
          after.record.status === "published" &&
          after.record.joining_state === "open" &&
          (after.ownState === "none" || after.ownState === "left"),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return unavailable();
  }
}

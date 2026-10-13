import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RichPeopleDetail } from "@pals/types";
import {
  localPeopleAvailable,
  type PeopleDetail,
} from "../../../../lib/people";

type RosterRow = {
  account_id: string;
  role_label: "host" | "cohost" | "participant";
};
export type RosterIdentity = { name: string; photoRevision: number | null };
export type RosterIdentities = Record<string, RosterIdentity>;

/** Only enrich the visible preview and host roles from the current authorized roster page. */
export async function readRosterIdentities(
  client: SupabaseClient,
  roster: RosterRow[],
  actorId: string,
): Promise<RosterIdentities> {
  if (!localPeopleAvailable()) return {};
  const selected = new Set([
    ...roster.slice(0, 6).map((row) => row.account_id),
    ...roster
      .slice(0, 24)
      .filter((row) => row.role_label !== "participant")
      .map((row) => row.account_id),
  ]);
  const identities: RosterIdentities = {};
  await Promise.all(
    [...selected]
      .filter((id) => id !== actorId)
      .map(async (id) => {
        try {
          const rich = await client.rpc("get_rich_people_detail", {
            p_account_id: id,
          });
          // RPC errors are authorization or availability outcomes, never a cue to try a weaker source.
          if (rich.error) return;
          const richRow = rich.data?.[0] as RichPeopleDetail | undefined;
          if (richRow) {
            if (
              richRow.account_id !== id ||
              typeof richRow.real_name !== "string" ||
              !richRow.real_name.trim()
            )
              return;
            const photoRevision =
              Array.isArray(richRow.photo_slots) &&
              richRow.photo_slots.includes("primary") &&
              Number.isSafeInteger(richRow.photo_revision) &&
              richRow.photo_revision > 0
                ? richRow.photo_revision
                : null;
            identities[id] = { name: richRow.real_name, photoRevision };
            return;
          }
          const text = await client.rpc("get_people_detail", {
            p_account_id: id,
          });
          if (text.error) return;
          const textRow = text.data?.[0] as PeopleDetail | undefined;
          if (
            textRow?.account_id === id &&
            typeof textRow.real_name === "string" &&
            textRow.real_name.trim()
          )
            identities[id] = { name: textRow.real_name, photoRevision: null };
        } catch {
          // A failed People read leaves the Hangout role visible without adding identity.
        }
      }),
  );
  return identities;
}

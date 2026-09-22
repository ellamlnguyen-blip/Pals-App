import "server-only";
import { notFound } from "next/navigation";
import { parseAppEnvironment } from "@pals/config";
import { authConfig } from "./config";
import { requireAccess } from "./access";
import type { SupabaseClient } from "@supabase/supabase-js";

export type OwnedHangout = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  public_place: string;
  public_latitude: number;
  public_longitude: number;
  campus_zone: string | null;
  revision: number;
  status: string;
  private_instructions: string;
};
export function localHangoutsAvailable() {
  return (
    parseAppEnvironment(process.env.APP_ENV) === "local" &&
    authConfig().url === "http://127.0.0.1:54321"
  );
}
export function requireLocalHangouts() {
  if (!localHangoutsAvailable()) notFound();
}
export async function ownedHangout(id: string): Promise<OwnedHangout | null> {
  requireLocalHangouts();
  const { client, user } = await requireAccess("ready");
  return readOwnedHangout(client, user!.id, id);
}
export async function readOwnedHangout(
  client: SupabaseClient,
  userId: string,
  id: string,
): Promise<OwnedHangout | null> {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id))
    return null;
  const { data: row, error } = await client
    .from("hangouts")
    .select(
      "id,title,description,starts_at,ends_at,public_place,public_latitude,public_longitude,campus_zone,revision,status,host_id",
    )
    .eq("id", id)
    .eq("host_id", userId)
    .maybeSingle();
  if (error || !row) return null;
  let privateInstructions = "";
  if (row.status === "published") {
    const { data: privateRow, error: privateError } = await client
      .from("hangout_private_locations")
      .select("instructions")
      .eq("hangout_id", id)
      .maybeSingle();
    if (privateError) return null;
    privateInstructions = privateRow?.instructions ?? "";
  }
  // A public read and private read use separate HTTP transactions. Recheck
  // live access and revision before returning either value to a page/action.
  const { data: liveState, error: liveError } =
    await client.rpc("get_access_state");
  if (liveError || liveState !== "ready") return null;
  const { data: latest, error: latestError } = await client
    .from("hangouts")
    .select("id,revision,status,host_id")
    .eq("id", id)
    .eq("host_id", userId)
    .maybeSingle();
  if (
    latestError ||
    !latest ||
    latest.revision !== row.revision ||
    latest.status !== row.status
  )
    return null;
  return {
    ...row,
    private_instructions:
      latest.status === "published" ? privateInstructions : "",
  };
}

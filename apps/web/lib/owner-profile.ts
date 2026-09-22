import "server-only";
import { requireAccess } from "./access";

// The caller's session and ready gate are checked on every action/page request.
export async function ownerProfile() {
  const { client, user } = await requireAccess("ready");
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", user!.id)
    .single();
  if (error || !data)
    throw new Error("Your profile could not load. Please try again.");
  return { client, user: user!, profile: data };
}

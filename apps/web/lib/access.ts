import "server-only";
import { redirect } from "next/navigation";
import { supabase } from "./supabase";

export async function access() {
  const client = await supabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    return { client, user: null, state: "signed_out" as const };
  const { data, error: gateError } = await client.rpc("get_access_state");
  if (gateError)
    throw new Error("We could not check account access. Please try again.");
  if (
    !["signed_out", "restricted", "unverified", "onboarding", "ready"].includes(
      data,
    )
  )
    throw new Error("Account access unavailable.");
  return { client, user, state: data as string };
}
export function accessPath(state: string) {
  return state === "ready"
    ? "/hangouts"
    : state === "onboarding"
      ? "/onboarding"
      : state === "restricted"
        ? "/restricted"
        : state === "unverified"
          ? "/verify"
          : "/signin";
}
export async function requireAccess(expected: "onboarding" | "ready") {
  const result = await access();
  if (result.state !== expected) redirect(accessPath(result.state));
  return result;
}

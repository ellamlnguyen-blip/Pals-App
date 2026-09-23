"use server";

import { access } from "../../lib/access";
import { peopleId, requireLocalPeople } from "../../lib/people";

export type PeopleActionResult = {
  state: "on" | "off" | "hidden" | "visible" | "unknown";
  message: string;
};

export async function setPeopleVisibility(
  optedIn: boolean,
): Promise<PeopleActionResult> {
  requireLocalPeople();
  const { client, state, user } = await access();
  if (state === "signed_out" || state === "restricted")
    return { state: "unknown", message: "Account access is unavailable." };
  if (optedIn) {
    const preview = await client
      .from("profiles")
      .select("real_name,graduation_year,major,bio,interests,down_to_do")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (preview.error || !preview.data)
      return {
        state: "unknown",
        message:
          "Your sharing preview is unavailable. Reload before turning it on.",
      };
  }
  let writeError = false;
  try {
    const result = await client.rpc("set_people_preference", {
      p_opted_in: optedIn,
    });
    writeError = !!result.error;
  } catch {
    writeError = true;
  }
  const { data, error } = await client.rpc("get_people_preference");
  if (error || typeof data !== "boolean")
    return {
      state: "unknown",
      message:
        "We could not confirm your visibility. Reload this page to check before trying again.",
    };
  if (writeError)
    return {
      state: data ? "on" : "off",
      message:
        "The request was not confirmed. Your stored sharing choice is shown above; it may not currently make you visible. Reload before trying again.",
    };
  return {
    state: data ? "on" : "off",
    message:
      data === optedIn
        ? data
          ? "Your sharing choice is on. People discovery still requires current access."
          : "Your sharing choice is off; your profile is hidden from People."
        : "The change did not take effect. Check your account access and try again.",
  };
}

export async function blockPerson(id: string): Promise<PeopleActionResult> {
  if (!peopleId.test(id))
    return { state: "unknown", message: "That person is unavailable." };
  // TASK-016A: old confirmation copy does not describe global Hangout teardown.
  // Reject stale server-action submissions until the reviewed safety UI ships.
  return {
    state: "unknown",
    message:
      "Creating a block is temporarily unavailable in this local build. A confirmed block now affects Hangout access and may end shared attendance; the new confirmation flow is being added.",
  };
}

export async function unblockPerson(id: string): Promise<PeopleActionResult> {
  requireLocalPeople();
  if (!peopleId.test(id))
    return { state: "unknown", message: "Choose a valid account ID." };
  const { client, state } = await access();
  if (state === "signed_out" || state === "restricted")
    return { state: "unknown", message: "Account access is unavailable." };
  let writeError = false;
  try {
    writeError = !!(
      await client.rpc("set_people_block", {
        p_account_id: id,
        p_blocked: false,
      })
    ).error;
  } catch {
    writeError = true;
  }
  const { data, error } = await client.rpc("list_people_blocked_ids");
  if (error)
    return {
      state: "unknown",
      message:
        "We could not confirm the unblock. Reload blocked IDs before another action.",
    };
  if (writeError)
    return {
      state: "unknown",
      message:
        "The unblock request was not confirmed. Reload the outbound IDs before another action.",
    };
  // The list is paged. A missing ID in the first page alone is not proof of removal.
  if (data?.some((row: { account_id: string }) => row.account_id === id))
    return {
      state: "hidden",
      message: "That ID is still on your outbound block list.",
    };
  return {
    state: "off",
    message: "Unblock requested. Reload the list to confirm its latest state.",
  };
}

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
  requireLocalPeople();
  if (!peopleId.test(id))
    return { state: "unknown", message: "That person is unavailable." };
  const { client, state } = await access();
  if (state !== "ready")
    return {
      state: "unknown",
      message: "People access changed. Return to People.",
    };
  let writeError = false;
  try {
    writeError = !!(
      await client.rpc("set_people_block", {
        p_account_id: id,
        p_blocked: true,
      })
    ).error;
  } catch {
    writeError = true;
  }
  // A matching outbound ID proves this caller owns the block. Traverse bounded pages;
  // absence from only the first page cannot establish an outcome.
  let after: string | null = null;
  for (let page = 0; page < 100; page++) {
    const { data, error } = await client.rpc("list_people_blocked_ids", {
      p_after_id: after,
      p_limit: 24,
    });
    if (error)
      return {
        state: "unknown",
        message:
          "We could not confirm the block. Reload your outbound blocked IDs before another action.",
      };
    const ids = (data ?? []) as { account_id: string }[];
    if (ids.some((row) => row.account_id === id))
      return {
        state: "hidden",
        message: writeError
          ? "The block response was uncertain, but this ID is on your outbound block list. Any current direct request or chat ended; friendship status should be rechecked when available. Existing Hangout access and chat are unchanged."
          : "This ID is on your outbound block list. Any current friend request, friendship, direct request or chat ended. Existing Hangout access, chat and private instructions are unchanged.",
      };
    if (ids.length < 24 || ids[23].account_id > id) break;
    after = ids[23].account_id;
  }
  return {
    state: "unknown",
    message:
      "We could not confirm an outbound block for this ID. Reload blocked IDs before another action.",
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

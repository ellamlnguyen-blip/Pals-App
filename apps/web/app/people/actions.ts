"use server";

import { access } from "../../lib/access";
import { peopleId, requireLocalPeople } from "../../lib/people";
import type { RichProfilePreference } from "@pals/types";

export type PeopleActionResult = {
  state: "on" | "off" | "hidden" | "visible" | "unknown";
  message: string;
};

export type RichSharingResult = {
  preference: RichProfilePreference | null;
  message: string;
};

function richPreference(data: unknown): RichProfilePreference | null {
  const row = Array.isArray(data) ? data[0] : null;
  if (
    !row ||
    typeof row.opted_in !== "boolean" ||
    typeof row.revision !== "number" ||
    !Number.isSafeInteger(row.revision) ||
    row.revision < 0
  )
    return null;
  return { opted_in: row.opted_in, revision: row.revision };
}

export async function setRichProfileSharing(
  optedIn: boolean,
  expectedRevision: number,
): Promise<RichSharingResult> {
  requireLocalPeople();
  const { client, state, user } = await access();
  if (!user || state === "signed_out" || state === "restricted")
    return { preference: null, message: "Account access is unavailable." };
  if (
    typeof optedIn !== "boolean" ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0
  )
    return {
      preference: null,
      message: "Reload your sharing choice before trying again.",
    };
  if (optedIn) {
    const preview = await client
      .from("profiles")
      .select(
        "real_name,hometown,primary_photo_path,additional_photo_paths,prompts",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    if (preview.error || !preview.data)
      return {
        preference: null,
        message:
          "Your sharing preview is unavailable. Reload before turning it on.",
      };
  }
  let writeError = false;
  try {
    const result = await client.rpc("set_my_rich_profile_preference", {
      p_opted_in: optedIn,
      p_expected_revision: expectedRevision,
    });
    writeError = !!result.error;
  } catch {
    writeError = true;
  }
  const current = await client.rpc("get_my_rich_profile_preference");
  const preference = current.error ? null : richPreference(current.data);
  if (!preference)
    return {
      preference: null,
      message:
        "We could not confirm your rich sharing choice. Reload before trying again.",
    };
  if (writeError)
    return {
      preference,
      message:
        "That change was not confirmed. The stored choice is shown here; reload the latest choice before trying again.",
    };
  return {
    preference,
    message:
      preference.opted_in === optedIn
        ? optedIn
          ? "Rich sharing is on for currently eligible students at your campus."
          : "Rich sharing is off. New peer requests cannot see these details."
        : "The change did not take effect. Reload and check your account access.",
  };
}

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
      "Open this person’s profile or Safety to review and confirm a block. A confirmed block can change shared Hangout access and attendance.",
  };
}

export async function unblockPerson(id: string): Promise<PeopleActionResult> {
  void id;
  return {
    state: "unknown",
    message: "Use Safety to confirm an exact outbound ID before unblocking.",
  };
}

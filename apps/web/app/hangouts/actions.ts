"use server";
import { revalidatePath } from "next/cache";
import { access } from "../../lib/access";
import { campusLocal, resolveCampusLocal } from "../../lib/hangout-time";
import { readOwnedHangout, requireLocalHangouts } from "../../lib/hangouts";

export type HangoutInput = {
  title: string;
  description: string;
  startsLocal: string;
  endsLocal: string;
  publicPlace: string;
  latitude: string;
  longitude: string;
  campusZone: string;
  privateInstructions: string;
};
export type HangoutResult =
  | { kind: "saved"; id: string; revision: number }
  | { kind: "invalid" | "denied" | "conflict" | "uncertain"; message: string };
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
function normalize(value: string, max: number, name: string, required = false) {
  if (typeof value !== "string") throw new Error(`${name} is invalid.`);
  const result = value.trim();
  if (result.length > max || (required && !result))
    throw new Error(
      `${name} must be ${required ? `1–${max}` : `at most ${max}`} characters.`,
    );
  return result || null;
}
function parseInput(
  input: HangoutInput,
  originalStart?: string,
  originalEnd?: string | null,
  replay = false,
) {
  const title = normalize(input.title, 120, "Title", true)!;
  const description = normalize(input.description, 2000, "Description");
  const publicPlace = normalize(input.publicPlace, 120, "Public area", true)!;
  const campusZone = normalize(input.campusZone, 80, "Campus area");
  const privateInstructions = normalize(
    input.privateInstructions,
    2000,
    "Private instructions",
  );
  const latitude = Number(Number(input.latitude).toFixed(3)),
    longitude = Number(Number(input.longitude).toFixed(3));
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 35.85 ||
    latitude > 35.97 ||
    longitude < -79.13 ||
    longitude > -78.98
  )
    throw new Error("Choose approximate coordinates near UNC Chapel Hill.");
  const start =
    originalStart && campusLocal(originalStart) === input.startsLocal
      ? { instant: originalStart }
      : resolveCampusLocal(input.startsLocal);
  const end = input.endsLocal
    ? originalEnd && campusLocal(originalEnd) === input.endsLocal
      ? { instant: originalEnd }
      : resolveCampusLocal(input.endsLocal)
    : { instant: undefined };
  if (!start.instant || (input.endsLocal && !end.instant))
    throw new Error(start.error ?? end.error ?? "Choose a valid campus time.");
  if (!replay && (!originalStart || start.instant !== originalStart)) {
    const delta = Date.parse(start.instant) - Date.now();
    if (delta < 0 || delta > 366 * 86400000)
      throw new Error("Start must be in the next 366 days.");
  }
  if (
    end.instant &&
    (Date.parse(end.instant) <= Date.parse(start.instant) ||
      Date.parse(end.instant) - Date.parse(start.instant) > 7 * 86400000)
  )
    throw new Error("End must follow start by no more than seven days.");
  return {
    p_title: title,
    p_description: description,
    p_starts_at: start.instant,
    p_ends_at: end.instant ?? null,
    p_public_place: publicPlace,
    p_public_latitude: latitude,
    p_public_longitude: longitude,
    p_campus_zone: campusZone,
    p_private_instructions: privateInstructions,
    p_visibility: "campus",
    p_location_precision: "approximate_area",
    p_eligibility: null,
  };
}
function failed(error: { code?: string } | null): HangoutResult {
  if (error?.code === "40001")
    return {
      kind: "conflict",
      message:
        "This Hangout changed in another tab. Review the latest saved details before trying again.",
    };
  if (["42501", "PGRST116"].includes(error?.code ?? ""))
    return {
      kind: "denied",
      message:
        "Hangout access is unavailable. Check your account and local Hangout access.",
    };
  if (["22023", "23514", "23502"].includes(error?.code ?? ""))
    return {
      kind: "invalid",
      message:
        "Some details need changing. Check the time, place and text limits.",
    };
  return {
    kind: "uncertain",
    message:
      "The response was interrupted. Your entries are still here. Check the saved Hangout before retrying.",
  };
}
export async function createHangout(
  serialized: string,
): Promise<HangoutResult> {
  requireLocalHangouts();
  let requestId: string, input: HangoutInput, replay: boolean;
  try {
    ({ requestId, input, replay } = JSON.parse(serialized));
  } catch {
    return { kind: "invalid", message: "Invalid Hangout request." };
  }
  replay = replay === true;
  if (!uuid.test(requestId))
    return { kind: "invalid", message: "Start a new Hangout request." };
  const { client, user, state } = await access();
  if (state !== "ready" || !user)
    return replay
      ? {
          kind: "uncertain",
          message:
            "Access changed while checking your original request. Keep this request and retry once access is restored.",
        }
      : {
          kind: "denied",
          message: "Your account is not ready to create a Hangout.",
        };
  let payload;
  try {
    payload = parseInput(input, undefined, undefined, replay);
  } catch (error) {
    return { kind: "invalid", message: (error as Error).message };
  }
  const args = { p_request_id: requestId, ...payload };
  let result = await client.rpc("create_hangout", args);
  const firstAmbiguous =
    !!result.error &&
    !["42501", "22023", "23514", "23502"].includes(result.error.code ?? "");
  // The first response can be lost after commit. Replaying the same UUID and
  // normalized payload is safe because the backend owns the retry ledger.
  if (firstAmbiguous) result = await client.rpc("create_hangout", args);
  if (result.error)
    return firstAmbiguous || replay
      ? {
          kind: "uncertain",
          message:
            "We could not verify whether the original request saved. Keep this request and retry after checking access; do not start a new Hangout yet.",
        }
      : failed(result.error);
  const record = await readOwnedHangout(client, user.id, String(result.data));
  if (
    !record ||
    record.status !== "published" ||
    (!replay &&
      (record.title !== payload.p_title ||
        record.private_instructions !== (payload.p_private_instructions ?? "")))
  )
    return {
      kind: "uncertain",
      message:
        "The save may have completed, but we could not verify its details. Retry this same request after checking local access.",
    };
  revalidatePath("/hangouts");
  return { kind: "saved", id: record.id, revision: record.revision };
}
export async function editHangout(serialized: string): Promise<HangoutResult> {
  requireLocalHangouts();
  let id: string, revision: number, input: HangoutInput;
  try {
    ({ id, revision, input } = JSON.parse(serialized));
  } catch {
    return { kind: "invalid", message: "Invalid Hangout request." };
  }
  if (!uuid.test(id) || !Number.isSafeInteger(revision) || revision < 1)
    return {
      kind: "invalid",
      message: "Reload the saved Hangout before editing.",
    };
  const { client, user, state } = await access();
  if (state !== "ready" || !user)
    return {
      kind: "denied",
      message: "Your account is not ready to edit this Hangout.",
    };
  const current = await readOwnedHangout(client, user.id, id);
  if (!current || current.status !== "published")
    return {
      kind: "denied",
      message: "This Hangout is unavailable for editing.",
    };
  let payload;
  try {
    payload = parseInput(input, current.starts_at, current.ends_at);
  } catch (error) {
    return { kind: "invalid", message: (error as Error).message };
  }
  const { data, error } = await client.rpc("edit_hangout", {
    p_hangout_id: id,
    p_expected_revision: revision,
    ...payload,
  });
  if (error) return failed(error);
  const saved = await readOwnedHangout(client, user.id, id);
  if (
    !saved ||
    saved.revision !== data ||
    saved.title !== payload.p_title ||
    saved.private_instructions !== (payload.p_private_instructions ?? "")
  )
    return {
      kind: "uncertain",
      message:
        "The edit may have saved. Reload this Hangout to review the latest details before another edit.",
    };
  revalidatePath(`/hangouts/owned/${id}`);
  return { kind: "saved", id, revision: saved.revision };
}

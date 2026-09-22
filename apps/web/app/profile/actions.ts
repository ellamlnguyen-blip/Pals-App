"use server";
import { revalidatePath } from "next/cache";
import {
  profileFields,
  optionalProfileFields,
  photoExtension,
} from "@pals/validation";
import { ownerProfile } from "../../lib/owner-profile";

export type ProfileResult = {
  error?: string;
  success?: string;
  revision?: number;
  cleanupNeeded?: boolean;
};
const conflict =
  "Your profile changed in another window. Reload the latest profile before saving again. Your entered text is still here.";
function expected(form: FormData) {
  const value = String(form.get("revision") ?? "");
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : -1;
}
export async function saveProfile(form: FormData): Promise<ProfileResult> {
  const { client, user, profile } = await ownerProfile();
  const revision = expected(form);
  if (profile.revision !== revision) return { error: conflict };
  const required = profileFields(form),
    optional = optionalProfileFields(form);
  if (!required || !optional)
    return {
      error:
        "Check your required fields and optional limits. Lists need unique items; each prompt needs both a question and answer. Instagram must be a handle, not a link.",
    };
  const { data, error } = await client
    .from("profiles")
    .update({ ...required, ...optional })
    .eq("user_id", user.id)
    .eq("revision", revision)
    .select("revision")
    .maybeSingle();
  if (error)
    return {
      error:
        "Your profile couldn’t save. Your entered text is still here. Please try again.",
    };
  if (!data) return { error: conflict };
  revalidatePath("/profile");
  return { success: "Profile saved.", revision: data.revision };
}
export async function changePhoto(form: FormData): Promise<ProfileResult> {
  const { client, user, profile } = await ownerProfile();
  const revision = expected(form);
  if (profile.revision !== revision) return { error: conflict };
  const slot = String(form.get("slot") ?? ""),
    operation = String(form.get("operation") ?? "");
  const extras: string[] = [...profile.additional_photo_paths];
  const index = /^[0-3]$/.test(slot) ? Number(slot) : -1;
  if (
    !["replace", "remove", "add"].includes(operation) ||
    (operation === "add" && (slot !== "new" || extras.length >= 4)) ||
    (operation !== "add" &&
      slot !== "primary" &&
      (index < 0 || index >= extras.length)) ||
    (operation === "remove" && slot === "primary")
  )
    return {
      error:
        "That photo option is unavailable. Reload your profile and try again.",
    };
  let path: string | null = null;
  if (operation !== "remove") {
    const photo = form.get("photo");
    if (
      !(photo instanceof File) ||
      photo.size === 0 ||
      photo.size > 5 * 1024 * 1024
    )
      return { error: "Choose a JPG, PNG or WebP photo under 5 MB." };
    const bytes = new Uint8Array(await photo.arrayBuffer()),
      ext = photoExtension(bytes);
    if (!ext)
      return {
        error:
          "This file isn’t a JPG, PNG or WebP image. Choose another photo.",
      };
    path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await client.storage
      .from("profile-photos")
      .upload(path, bytes, {
        contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        upsert: false,
      });
    if (error) {
      // An upload can commit before its response is lost. Try the known fresh
      // path; the same database guard protects any concurrent assignment.
      const cleanup = await client.storage
        .from("profile-photos")
        .remove([path]);
      return {
        error:
          "We couldn’t confirm the photo upload. This upload attempt did not update your profile. Choose the file again to retry.",
        cleanupNeeded:
          !!cleanup.error || !cleanup.data?.some((item) => item.name === path),
      };
    }
  }
  const oldPath =
    operation === "add"
      ? null
      : slot === "primary"
        ? profile.primary_photo_path
        : extras[index];
  if (operation === "add") extras.push(path!);
  else if (slot !== "primary") {
    if (operation === "remove") extras.splice(index, 1);
    else extras[index] = path!;
  }
  const { data, error } = await client
    .from("profiles")
    .update({
      primary_photo_path:
        slot === "primary" ? path : profile.primary_photo_path,
      additional_photo_paths: extras,
    })
    .eq("user_id", user.id)
    .eq("revision", revision)
    .select("revision")
    .maybeSingle();
  const cleanupPath = error || !data ? path : oldPath;
  let cleanupNeeded = false;
  if (cleanupPath) {
    // The database deletion trigger is the final authority, including concurrent
    // assignments. Storage remove can return success with no authorized rows.
    const result = await client.storage
      .from("profile-photos")
      .remove([cleanupPath]);
    cleanupNeeded =
      !!result.error || !result.data?.some((item) => item.name === cleanupPath);
  }
  if (error || !data)
    return {
      error: !error
        ? conflict
        : "We couldn’t confirm whether the photo saved. Reload your profile to check the current photos before trying again.",
      cleanupNeeded,
    };
  revalidatePath("/profile");
  return { success: "Photos saved.", revision: data.revision, cleanupNeeded };
}
export async function cleanupPhotos(): Promise<ProfileResult> {
  const { client, user, profile } = await ownerProfile();
  const used = new Set([
    profile.primary_photo_path,
    ...profile.additional_photo_paths,
  ]);
  const { data, error } = await client.storage
    .from("profile-photos")
    .list(user.id, { limit: 100 });
  if (error || !data)
    return {
      error: "Unused photos couldn’t be checked. Please retry.",
      cleanupNeeded: true,
    };
  const unused = data
    .filter((o) => o.id && !used.has(`${user.id}/${o.name}`))
    .map((o) => `${user.id}/${o.name}`);
  if (!unused.length)
    return {
      success: "No unused photos remain in this batch.",
      cleanupNeeded: data.length === 100,
    };
  const result = await client.storage.from("profile-photos").remove(unused);
  const remaining =
    !!result.error ||
    result.data?.length !== unused.length ||
    data.length === 100;
  return {
    success: remaining
      ? "Some unused photos may remain private. Retry cleanup to check again."
      : "Unused photos removed.",
    cleanupNeeded: remaining,
  };
}

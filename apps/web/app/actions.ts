"use server";

import { redirect } from "next/navigation";
import {
  approvedUncEmail,
  profileFields,
  photoExtension,
} from "@pals/validation";
import { supabase } from "../lib/supabase";
import { authConfig } from "../lib/config";
import { access, accessPath, requireAccess } from "../lib/access";

export type FormState = {
  error?: string;
  success?: string;
  values?: Record<string, string>;
};
function safeValues(form: FormData) {
  return Object.fromEntries(
    ["email", "real_name", "graduation_year", "major", "bio"].map((name) => [
      name,
      String(form.get(name) ?? "").slice(0, 2000),
    ]),
  );
}
export async function signUp(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!approvedUncEmail(email))
    return {
      error: "Use an approved UNC email address. Check the domain list below.",
      values: safeValues(form),
    };
  if (password.length < 12 || password.length > 128)
    return {
      error: "Choose a password between 12 and 128 characters.",
      values: safeValues(form),
    };
  const client = await supabase();
  const { error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${authConfig().origin}/auth/callback` },
  });
  if (error)
    return {
      error:
        "We couldn’t send your confirmation. Try again shortly, or sign in if you already have an account.",
      values: safeValues(form),
    };
  redirect("/verify?sent=1");
}
export async function signIn(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const client = await supabase();
  const { error } = await client.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error)
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email first. You can request a new link below."
          : "We couldn’t sign you in. Check your email and password and try again.",
      values: safeValues(form),
    };
  redirect(`${accessPath((await access()).state)}?pals_auth_done=signin`);
}
export async function resendConfirmation(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!approvedUncEmail(email))
    return {
      error: "Enter your approved UNC email address.",
      values: safeValues(form),
    };
  const client = await supabase();
  const { error } = await client.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${authConfig().origin}/auth/callback` },
  });
  return error
    ? {
        error: "We couldn’t resend yet. Wait a minute and try again.",
        values: safeValues(form),
      }
    : {
        success:
          "If this account needs confirmation, a new link is on its way. Open it in this browser.",
      };
}
export async function signOut() {
  const client = await supabase();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new Error("Sign out did not finish. Please try again.");
  redirect("/signin?pals_auth_done=signout");
}
export async function completeProfile(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { client, user } = await requireAccess("onboarding");
  const fields = profileFields(form);
  if (!fields)
    return {
      error:
        "Complete each field. Use a graduation year between 1900 and 2200.",
      values: safeValues(form),
    };
  const photo = form.get("photo");
  if (
    !(photo instanceof File) ||
    photo.size === 0 ||
    photo.size > 5 * 1024 * 1024
  )
    return {
      error: "Choose a JPG, PNG or WebP photo under 5 MB.",
      values: safeValues(form),
    };
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const ext = photoExtension(bytes);
  if (!ext)
    return {
      error:
        "This file isn’t a JPG, PNG or WebP image. Please choose another photo.",
      values: safeValues(form),
    };
  const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await client.storage
    .from("profile-photos")
    .upload(path, bytes, {
      contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
      upsert: false,
    });
  if (uploadError)
    return {
      error: "Your photo couldn’t upload. Check your connection and try again.",
      values: safeValues(form),
    };
  const { error, data } = await client
    .from("profiles")
    .update({ ...fields, primary_photo_path: path })
    .eq("user_id", user!.id)
    .select("user_id")
    .single();
  if (error || !data) {
    await client.storage.from("profile-photos").remove([path]);
    return {
      error: "Your profile couldn’t save. Please try again.",
      values: safeValues(form),
    };
  }
  redirect(accessPath((await access()).state));
}

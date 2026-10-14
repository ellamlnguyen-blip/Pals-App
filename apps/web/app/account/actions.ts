"use server";

import { revalidatePath } from "next/cache";
import { ownerProfile } from "../../lib/owner-profile";
import { authConfig } from "../../lib/config";
import { verifyAccountPassword } from "../../lib/account-auth";
import {
  accountEmail,
  accountCurrentPassword,
  accountName,
  accountPassword,
  accountRevision,
} from "../../lib/account-input";

export type AccountResult = {
  error?: string;
  success?: string;
  revision?: number;
};

const conflict =
  "Your profile changed in another window. Reload to see the latest name; your draft is still here.";
export async function saveAccountName(form: FormData): Promise<AccountResult> {
  const { client, user, profile } = await ownerProfile();
  const name = accountName(form.get("real_name"));
  const revision = accountRevision(form.get("revision"));
  if (!name) return { error: "Enter your real name, up to 100 characters." };
  if (revision === null || profile.revision !== revision)
    return { error: conflict };
  if (profile.real_name === name)
    return { success: "Your name is already current.", revision };
  const { data, error } = await client
    .from("profiles")
    .update({ real_name: name })
    .eq("user_id", user.id)
    .eq("revision", revision)
    .select("revision")
    .maybeSingle();
  if (error)
    return {
      error: "Your name couldn’t save. Your draft is still here. Try again.",
    };
  if (!data) return { error: conflict };
  revalidatePath("/account");
  revalidatePath("/profile");
  return { success: "Name saved.", revision: data.revision };
}

export async function changeAccountEmail(
  form: FormData,
): Promise<AccountResult> {
  const { client, user } = await ownerProfile();
  const email = accountEmail(form.get("email"));
  const password = accountCurrentPassword(form.get("current_password"));
  if (!email)
    return { error: "Enter an address on an approved UNC email domain." };
  if (email === user.email?.toLowerCase())
    return { error: "That is already your current sign-in email." };
  if (!password)
    return { error: "Enter your current password to request this change." };
  if (
    !user.email ||
    !(await verifyAccountPassword(user.id, user.email, password))
  )
    return {
      error:
        "We couldn’t verify your current password or account access. Try again.",
    };
  const { error } = await client.auth.updateUser(
    { email },
    { emailRedirectTo: `${authConfig().origin}/auth/callback` },
  );
  if (error)
    return {
      error:
        "Your email change couldn’t be requested. Check your address and try again.",
    };
  revalidatePath("/account");
  return {
    success:
      "Request submitted. Check your inboxes for confirmation, then reopen this page to see the current sign-in email.",
  };
}

export async function changeAccountPassword(
  form: FormData,
): Promise<AccountResult> {
  const { client, user } = await ownerProfile();
  const password = accountCurrentPassword(form.get("current_password"));
  const nextPassword = accountPassword(form.get("new_password"));
  const confirmation = form.get("confirm_password");
  const nonce = form.get("nonce");
  if (!password) return { error: "Enter your current password." };
  if (!nextPassword)
    return { error: "Choose a new password between 12 and 128 characters." };
  if (nextPassword !== confirmation)
    return { error: "The new passwords do not match." };
  if (password === nextPassword)
    return { error: "Choose a different new password." };
  if (
    nonce !== null &&
    nonce !== "" &&
    (typeof nonce !== "string" || !/^\d{6}$/.test(nonce))
  )
    return {
      error: "Enter the six-digit reauthentication code from your email.",
    };
  if (
    !user.email ||
    !(await verifyAccountPassword(user.id, user.email, password))
  )
    return {
      error:
        "We couldn’t verify your current password or account access. Try again.",
    };
  const { error } = await client.auth.updateUser({
    password: nextPassword,
    ...(typeof nonce === "string" && /^\d{6}$/.test(nonce) ? { nonce } : {}),
  });
  if (error)
    return {
      error:
        "Your password couldn’t change. If you received a reauthentication code, enter it and try again.",
    };
  return {
    success: "Password changed. Use the new password next time you sign in.",
  };
}

export async function requestPasswordCode(): Promise<AccountResult> {
  const { client } = await ownerProfile();
  const { error } = await client.auth.reauthenticate();
  return error
    ? { error: "We couldn’t send a reauthentication code. Try again shortly." }
    : {
        success:
          "If a code is required, check your current sign-in email and enter it below.",
      };
}

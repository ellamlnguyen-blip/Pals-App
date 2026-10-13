import "server-only";
import { parseAppEnvironment, validateSupabaseTarget } from "@pals/config";
import { adminOrigin, enrollmentWindow } from "./security";

export function authConfig() {
  const environment = parseAppEnvironment(process.env.APP_ENV);
  const origin = adminOrigin(environment, process.env.APP_ORIGIN);
  const url = validateSupabaseTarget(
    environment,
    process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
    process.env.SUPABASE_PROJECT_REF,
  );
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key || key.startsWith("sb_secret_"))
    throw new Error("Missing publishable key.");
  if (!key.startsWith("sb_publishable_")) {
    try {
      if (
        JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString())
          .role !== "anon"
      )
        throw new Error();
    } catch {
      throw new Error("Only an anon key is permitted.");
    }
  }
  return { url, key, origin, secure: environment !== "local" };
}

/** Temporary, exact-subject setup window; closed unless explicitly set. */
export function mayEnrollOperator(userId: string) {
  return enrollmentWindow(
    process.env.ADMIN_MFA_ENROLLMENT_ENABLED,
    process.env.ADMIN_MFA_ENROLLMENT_SUBJECT,
    process.env.ADMIN_MFA_ENROLLMENT_EXPIRES_AT,
    userId,
  );
}

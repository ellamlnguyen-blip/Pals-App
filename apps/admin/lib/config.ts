import "server-only";
import { parseAppEnvironment, validateSupabaseTarget } from "@pals/config";

export function authConfig() {
  const environment = parseAppEnvironment(process.env.APP_ENV);
  if (environment !== "local") throw new Error("Admin is local only.");
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
  const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3001";
  if (origin !== "http://127.0.0.1:3001")
    throw new Error("Admin origin must be local port 3001.");
  return { url, key };
}

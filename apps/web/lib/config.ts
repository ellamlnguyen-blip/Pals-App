import { parseAppEnvironment, validateSupabaseTarget } from "@pals/config";

export function authConfig() {
  const environment = parseAppEnvironment(process.env.APP_ENV);
  const url = validateSupabaseTarget(
    environment,
    process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
    process.env.SUPABASE_PROJECT_REF,
  );
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!key || key.startsWith("sb_secret_"))
    throw new Error("Configure a Supabase publishable or legacy anon key.");
  if (!key.startsWith("sb_publishable_")) {
    try {
      if (
        JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString())
          .role !== "anon"
      )
        throw new Error();
    } catch {
      throw new Error("Only a publishable or legacy anon key is permitted.");
    }
  }
  const origin = new URL(process.env.APP_ORIGIN ?? "http://127.0.0.1:3000");
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    (environment === "local"
      ? origin.origin !== "http://127.0.0.1:3000"
      : origin.protocol !== "https:")
  ) {
    throw new Error(
      "APP_ORIGIN must be the exact local origin or an explicit hosted HTTPS origin.",
    );
  }
  return { url, key, origin: origin.origin, secure: environment !== "local" };
}

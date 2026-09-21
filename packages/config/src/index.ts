export type AppEnvironment = "local" | "staging" | "production";

/** Deployment environment is separate from Next.js NODE_ENV (build mode). */
export function parseAppEnvironment(value?: string): AppEnvironment {
  if (value === undefined || value === "") return "local";
  if (value === "local" || value === "staging" || value === "production")
    return value;
  throw new Error("APP_ENV must be local, staging, or production.");
}

/** Validate a backend target before constructing any provider client. */
export function validateSupabaseTarget(
  environment: AppEnvironment,
  value: string,
  expectedProjectRef?: string,
): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SUPABASE_URL must be an absolute URL.");
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "SUPABASE_URL must be an origin without credentials or a path.",
    );
  if (environment === "local") {
    if (
      url.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.port !== "54321"
    )
      throw new Error("Local Supabase must use loopback HTTP on port 54321.");
  } else if (
    !expectedProjectRef ||
    !/^[a-z0-9]{20}$/.test(expectedProjectRef) ||
    url.protocol !== "https:" ||
    url.hostname !== `${expectedProjectRef}.supabase.co` ||
    url.port !== ""
  ) {
    throw new Error(
      "Hosted Supabase must match the explicitly configured project reference.",
    );
  }
  return url.origin;
}

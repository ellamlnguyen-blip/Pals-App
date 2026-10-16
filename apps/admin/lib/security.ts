export function enrollmentWindow(
  enabled: string | undefined,
  subject: string | undefined,
  expires: string | undefined,
  userId: string,
  now = Date.now(),
) {
  if (
    enabled !== "true" ||
    subject !== userId ||
    !expires ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(expires)
  )
    return false;
  const deadline = Date.parse(expires);
  const remaining = deadline - now;
  return (
    Number.isFinite(deadline) &&
    remaining > 0 &&
    remaining <= 24 * 60 * 60 * 1000
  );
}

export function originMatches(
  header: string | null,
  configured: string,
  protocol: string,
  secure: boolean,
) {
  return header === configured && (!secure || protocol === "https:");
}

export function cookiePolicy(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };
}

export function adminOrigin(
  environment: "local" | "staging" | "production",
  value: string | undefined,
) {
  if (environment === "production")
    throw new Error("Admin production target is not approved.");
  const origin = new URL(value ?? "http://127.0.0.1:3001");
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    (environment === "local"
      ? origin.origin !== "http://127.0.0.1:3001"
      : origin.protocol !== "https:" || !value)
  )
    throw new Error("Admin requires an exact configured origin.");
  return origin.origin;
}

export function factorMayChallenge(status: string, enrollmentOpen: boolean) {
  return status === "verified" || enrollmentOpen;
}

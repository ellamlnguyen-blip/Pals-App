import "server-only";
import { parseAppEnvironment } from "@pals/config";
import { access } from "./access";
import { authConfig } from "./config";
import { globalConfirmationVersion } from "./safety-public";

export const safetyId =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export const safetyHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
export const safetyCategories = [
  "harassment",
  "safety concern",
  "impersonation",
  "spam/commercial promotion",
  "other",
] as const;
export const safetyModes = ["user", "hangout", "hangout_host"] as const;
export { globalConfirmationVersion };

export function localSafetyAvailable() {
  const config = authConfig();
  return (
    parseAppEnvironment(process.env.APP_ENV) === "local" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.url).hostname)
  );
}

export async function safetyAccess(actor: string | null) {
  try {
    if (!localSafetyAvailable() || !actor || !safetyId.test(actor)) return null;
    const target = await access();
    if (
      !target.user ||
      target.user.id !== actor ||
      ["signed_out", "restricted"].includes(target.state)
    )
      return null;
    return { client: target.client, user: target.user };
  } catch {
    return null;
  }
}

// The keyset API is strictly greater-than; querying after the preceding UUID
// makes the first result authoritative for this exact ID.
export function previousUuid(id: string): string | null {
  const value = BigInt(`0x${id.replaceAll("-", "")}`);
  if (value === 0n) return null;
  const hex = (value - 1n).toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

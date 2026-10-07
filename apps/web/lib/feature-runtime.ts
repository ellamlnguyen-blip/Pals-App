import "server-only";
import { parseAppEnvironment } from "@pals/config";
import { authConfig } from "./config";

/**
 * A valid, explicitly configured Supabase target is required before student
 * routes are exposed. These are route-availability hints only: every operation
 * still relies on live account state and database/RLS authorization.
 */
export function studentFeaturesAvailable() {
  try {
    const environment = parseAppEnvironment(process.env.APP_ENV);
    const { url } = authConfig();
    if (environment !== "local") return url.endsWith(".supabase.co");
    return url === "http://127.0.0.1:54321";
  } catch {
    return false;
  }
}

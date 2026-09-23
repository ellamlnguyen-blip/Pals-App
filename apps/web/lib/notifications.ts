import "server-only";
import { access } from "./access";
import { authConfig } from "./config";
import { parseAppEnvironment } from "@pals/config";
import { peopleId } from "./people";
export const notificationId = peopleId;
export const notificationHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
export const categories = [
  "social_requests",
  "messages",
  "hangout_updates",
  "host_activity",
] as const;
export function localNotificationsAvailable() {
  const config = authConfig();
  return (
    parseAppEnvironment(process.env.APP_ENV) === "local" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.url).hostname)
  );
}
export async function notificationAccess(actor: string | null) {
  try {
    if (!localNotificationsAvailable() || !actor || !notificationId.test(actor))
      return null;
    const target = await access();
    if (
      !target.user ||
      target.user.id !== actor ||
      ["signed_out", "restricted"].includes(target.state)
    )
      return null;
    return { client: target.client, user: target.user, state: target.state };
  } catch {
    return null;
  }
}

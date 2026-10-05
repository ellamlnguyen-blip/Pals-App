import "server-only";
import { access } from "./access";
import { studentFeaturesAvailable } from "./feature-runtime";
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
  return studentFeaturesAvailable();
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

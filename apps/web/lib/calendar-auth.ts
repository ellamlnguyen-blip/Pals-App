import type { AuthTransitionMessage } from "../app/auth-transition";

/** Keep private Calendar data masked until every observed auth change settles. */
export function calendarAuthMayReload(
  pending: Set<string>,
  message: AuthTransitionMessage,
) {
  if (message.phase === "begin") {
    pending.add(message.token);
    return false;
  }
  if (message.phase !== "revalidate") pending.delete(message.token);
  return pending.size === 0;
}

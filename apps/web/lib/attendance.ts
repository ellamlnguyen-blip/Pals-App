import "server-only";
import { localHangoutsAvailable } from "./hangouts";
import { access } from "./access";

export const attendanceId =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export const attendanceHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
export function localAttendanceAvailable() {
  return localHangoutsAvailable();
}
export async function attendanceAccess(actor: string | null) {
  try {
    if (!localAttendanceAvailable() || !actor || !attendanceId.test(actor))
      return null;
    const result = await access();
    if (
      !result.user ||
      result.user.id !== actor ||
      ["signed_out", "restricted"].includes(result.state)
    )
      return null;
    return { client: result.client, actor: result.user.id };
  } catch {
    return null;
  }
}

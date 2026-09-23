import "server-only";
import { access } from "./access";
import { localPeopleAvailable, peopleId } from "./people";

export const dmId = peopleId;
export type DmStatus = {
  peer_id: string;
  generation_id: string;
  direction: "incoming" | "outgoing";
  state: "pending" | "accepted";
};
export type DmMessage = {
  message_id: string;
  sequence: number;
  body: string;
  created_at: string;
  mine: boolean;
};
export type DmInboxRow = DmStatus & {
  created_at: string;
  first_body: string | null;
};
export async function dmAccess(actor: string | null) {
  try {
    if (!localPeopleAvailable()) return null;
    const result = await access();
    return result.user?.id === actor &&
      !["signed_out", "restricted"].includes(result.state)
      ? result
      : null;
  } catch {
    // The API caller receives a neutral no-store denial if Auth is unavailable.
    return null;
  }
}
export const dmErrorKind = (code?: string) =>
  code === "42501" ? "denied" : code === "23505" ? "conflict" : "error";
export const dmHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

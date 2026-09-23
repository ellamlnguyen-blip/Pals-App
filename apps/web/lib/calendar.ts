import "server-only";
import { access } from "./access";
import { requireLocalHangouts } from "./hangouts";
import {
  calendarRange,
  compareCalendar,
  validSelection,
} from "./calendar-time";

const fields = "id,title,starts_at,ends_at,public_place,status,host_id";
type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  public_place: string;
  status: string;
  host_id: string;
  hangout_participants?: { account_id: string }[];
};
export async function queryCalendar(selection: unknown) {
  requireLocalHangouts();
  if (!validSelection(selection))
    return { kind: "invalid" as const, items: [], truncated: false };
  const { client, user, state } = await access();
  if (!user || state !== "ready")
    return { kind: "denied" as const, items: [], truncated: false };
  const filters = selection;
  const { start, end } = calendarRange(filters);
  async function read() {
    // Caller-only embed; RLS exposes joined/current-ready rows, never history.
    const embed =
      filters.filter === "joined"
        ? "hangout_participants!inner(account_id)"
        : "hangout_participants(account_id)";
    let published = client
      .from("hangouts")
      .select(`${fields},${embed}`)
      .eq("visibility", "campus")
      .eq("status", "published")
      .eq("hangout_participants.account_id", user!.id)
      .lt("starts_at", end)
      .or(`ends_at.gt.${start},and(ends_at.is.null,starts_at.gte.${start})`)
      .order("starts_at")
      .order("id")
      .limit(101);
    if (filters.filter === "hosting")
      published = published.eq("host_id", user!.id);
    const result = await published;
    if (result.error) return null;
    let cancelled: Row[] = [];
    if (filters.filter !== "discoverable") {
      // Cancelled roster is intentionally invisible. Public RLS itself proves
      // caller is the host or still joined, including host's joined invariant.
      let query = client
        .from("hangouts")
        .select(fields)
        .eq("visibility", "campus")
        .eq("status", "cancelled")
        .lt("starts_at", end)
        .or(`ends_at.gt.${start},and(ends_at.is.null,starts_at.gte.${start})`)
        .order("starts_at")
        .order("id")
        .limit(101);
      if (filters.filter === "hosting") query = query.eq("host_id", user!.id);
      const result = await query;
      if (result.error) return null;
      cancelled = result.data as unknown as Row[];
    }
    return [...(result.data as unknown as Row[]), ...cancelled]
      .sort(compareCalendar)
      .map((row) => ({
        id: row.id,
        title: row.title,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        public_place: row.public_place,
        status: row.status,
        relationship:
          row.host_id === user!.id
            ? "hosting"
            : row.status === "cancelled" ||
                row.hangout_participants?.some(
                  (member) => member.account_id === user!.id,
                )
              ? "joined"
              : "none",
      }));
  }
  const initial = await read();
  if (!initial) return { kind: "error" as const, items: [], truncated: false };
  const live = await client.rpc("get_access_state");
  if (live.error || live.data !== "ready")
    return { kind: "denied" as const, items: [], truncated: false };
  const verified = await read();
  if (!verified || JSON.stringify(initial) !== JSON.stringify(verified))
    return { kind: "error" as const, items: [], truncated: false };
  return {
    kind: "ok" as const,
    items: verified.slice(0, 100),
    truncated: verified.length > 100,
  };
}

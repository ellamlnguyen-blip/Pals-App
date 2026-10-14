import "server-only";
import { access } from "./access";
import { requireLocalHangouts } from "./hangouts";
import {
  calendarRange,
  compareCalendar,
  selectedCategory,
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
    if (!filters.hosting && !filters.attending && !filters.all) return [];
    // Each selected source is filtered before its own 101-row probe. A global
    // discovery limit could otherwise hide personal plans late in the range.
    const groups: Row[][] = [];
    for (const category of ["hosting", "attending", "all"] as const) {
      if (!filters[category]) continue;
      const embed =
        category === "attending"
          ? "hangout_participants!inner(account_id)"
          : category === "all"
            ? "own_membership:hangout_participants(account_id)"
            : null;
      let query = client
        .from("hangouts")
        .select(embed ? `${fields},${embed}` : fields)
        .eq("visibility", "campus")
        .eq("status", "published")
        .lt("starts_at", end)
        .or(`ends_at.gt.${start},and(ends_at.is.null,starts_at.gte.${start})`)
        .order("starts_at")
        .order("id")
        .limit(101);
      if (category === "hosting") query = query.eq("host_id", user!.id);
      if (category === "attending")
        query = query
          .neq("host_id", user!.id)
          .eq("hangout_participants.account_id", user!.id);
      if (category === "all")
        // Filter the embed to this actor, then anti-join it. account_id is
        // selected because the roster grant is column-scoped; an empty embed
        // requires table-wide SELECT. Anti-joined rows expose no child data.
        // PostgREST applies both exclusions before the top-level limit.
        query = query
          .neq("host_id", user!.id)
          .eq("own_membership.account_id", user!.id)
          .is("own_membership", null);
      const result = await query;
      if (result.error) return null;
      groups.push(result.data as unknown as Row[]);
    }
    // Cancelled plans are visible only through the source RLS to their existing
    // host/current participants. They never enter the discoverable category.
    for (const category of ["hosting", "attending"] as const) {
      if (!filters[category]) continue;
      let cancelled = client
        .from("hangouts")
        .select(fields)
        .eq("visibility", "campus")
        .eq("status", "cancelled")
        .lt("starts_at", end)
        .or(`ends_at.gt.${start},and(ends_at.is.null,starts_at.gte.${start})`)
        .order("starts_at")
        .order("id")
        .limit(101);
      if (category === "hosting") cancelled = cancelled.eq("host_id", user!.id);
      else cancelled = cancelled.neq("host_id", user!.id);
      const result = await cancelled;
      if (result.error) return null;
      groups.push(result.data as unknown as Row[]);
    }
    const rows = [
      ...new Map(groups.flat().map((row) => [row.id, row])).values(),
    ];
    return rows
      .map((row) => ({
        id: row.id,
        title: row.title,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        public_place: row.public_place,
        status: row.status,
        relationship: (row.host_id === user!.id
          ? "hosting"
          : row.status === "cancelled" ||
              row.hangout_participants?.some(
                (member) => member.account_id === user!.id,
              )
            ? "joined"
            : "none") as "hosting" | "joined" | "none",
      }))
      .filter((row) => selectedCategory(row, filters))
      .sort(compareCalendar)
      .slice(0, 101);
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

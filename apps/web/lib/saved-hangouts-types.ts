export const UNC_BOUNDS = {
  west: -79.13,
  south: 35.85,
  east: -78.98,
  north: 35.97,
};
export function validSavedHangoutId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
  );
}
export type Bounds = typeof UNC_BOUNDS;
export type SavedTimeFilter = "upcoming" | "all" | PeriodMask;
export type SavedFilter = { time: SavedTimeFilter; joining: "any" | "open" };
export type PeriodMask = string & { readonly __periodMask: unique symbol };
export type SavedPeriod = "today" | "tomorrow" | "thisWeek" | "later";
const NEW_YORK = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function validPeriodMask(value: unknown): value is PeriodMask {
  return (
    typeof value === "string" && value.length === 4 && /^[01]{4}$/.test(value)
  );
}

function civilDay(value: Date): number {
  const parts = NEW_YORK.formatToParts(value);
  const number = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return (
    Date.UTC(number("year"), number("month") - 1, number("day")) / 86_400_000
  );
}

function midnightForCivilDay(day: number): Date {
  // New York midnight is within 12 hours of UTC midnight. Binary search the
  // first instant of the civil day instead of adding fixed 24-hour durations.
  let low = day * 86_400_000 - 12 * 3_600_000;
  let high = day * 86_400_000 + 12 * 3_600_000;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (civilDay(new Date(middle)) < day) low = middle + 1;
    else high = middle;
  }
  return new Date(low);
}

export function savedPeriodBounds(cutoff: Date) {
  if (!Number.isFinite(cutoff.getTime())) return null;
  const today = civilDay(cutoff);
  const weekday = new Date(today * 86_400_000).getUTCDay();
  const daysUntilNextMonday = 8 - (weekday === 0 ? 7 : weekday);
  return {
    tomorrow: midnightForCivilDay(today + 1),
    dayAfterTomorrow: midnightForCivilDay(today + 2),
    nextMonday: midnightForCivilDay(today + daysUntilNextMonday),
    later: midnightForCivilDay(today + Math.max(2, daysUntilNextMonday)),
  };
}

// Compare civil days, so a 23- or 25-hour DST day remains exactly one day.
export function savedPeriod(cutoff: Date, startsAt: Date): SavedPeriod | null {
  if (
    !Number.isFinite(cutoff.getTime()) ||
    !Number.isFinite(startsAt.getTime()) ||
    startsAt < cutoff
  )
    return null;
  const today = civilDay(cutoff);
  const day = civilDay(startsAt);
  const weekday = new Date(today * 86_400_000).getUTCDay();
  const daysUntilNextMonday = 8 - (weekday === 0 ? 7 : weekday);
  if (day === today) return "today";
  if (day === today + 1) return "tomorrow";
  if (day < today + Math.max(2, daysUntilNextMonday)) return "thisWeek";
  return "later";
}

export function selectedSavedStart(
  filter: SavedTimeFilter,
  cutoff: Date,
  startsAt: Date,
): boolean {
  if (filter === "all") return Number.isFinite(startsAt.getTime());
  if (filter === "upcoming")
    return Number.isFinite(startsAt.getTime()) && startsAt >= cutoff;
  if (!validPeriodMask(filter)) return false;
  const period = savedPeriod(cutoff, startsAt);
  return (
    period !== null &&
    filter[{ today: 0, tomorrow: 1, thisWeek: 2, later: 3 }[period]] === "1"
  );
}
export type SavedPin = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  public_place: string;
  public_latitude: number;
  public_longitude: number;
  campus_zone: string | null;
  joining_state: string;
};
export type SavedDetail = SavedPin & {
  host_id: string;
  status: string;
  revision: number;
};
export type ParticipantState =
  "host" | "joined" | "left" | "removed" | "none" | "unknown";

// A Hangout revision does not cover every roster visibility transition
// (for example, a block can remove a visible ID without changing it).
export function sameVisiblePage(
  first: readonly { account_id: string; role_label?: string }[],
  second: readonly { account_id: string; role_label?: string }[],
) {
  return (
    first.length === second.length &&
    first.every(
      (row, index) =>
        row.account_id === second[index].account_id &&
        row.role_label === second[index].role_label,
    )
  );
}

import { campusLocal, resolveCampusLocal } from "./hangout-time.ts";

export type CalendarSelection = {
  date: string;
  view: "day" | "week" | "month";
  hosting: boolean;
  attending: boolean;
  all: boolean;
};
export const MIN_CALENDAR_DATE = "2000-01-03";
export const MAX_CALENDAR_DATE = "2100-12-26";
export function campusToday() {
  return campusLocal(new Date().toISOString()).slice(0, 10);
}
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function addMonths(date: string, months: number) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1))
    .toISOString()
    .slice(0, 10);
}
export function validSelection(value: unknown): value is CalendarSelection {
  if (!value || typeof value !== "object") return false;
  const input = value as CalendarSelection;
  return (
    typeof input.date === "string" &&
    /^\d{4}-\d\d-\d\d$/.test(input.date) &&
    input.date >= MIN_CALENDAR_DATE &&
    input.date <= MAX_CALENDAR_DATE &&
    !Number.isNaN(Date.parse(`${input.date}T12:00:00Z`)) &&
    new Date(`${input.date}T12:00:00Z`).toISOString().slice(0, 10) ===
      input.date &&
    ["day", "week", "month"].includes(input.view) &&
    typeof input.hosting === "boolean" &&
    typeof input.attending === "boolean" &&
    typeof input.all === "boolean"
  );
}
export function calendarRange(selection: CalendarSelection) {
  const anchor =
    selection.view === "month"
      ? `${selection.date.slice(0, 7)}-01`
      : selection.date;
  const weekday = new Date(`${anchor}T12:00:00Z`).getUTCDay();
  const first =
    selection.view === "day" ? anchor : addDays(anchor, -((weekday + 6) % 7));
  const length =
    selection.view === "day" ? 1 : selection.view === "week" ? 7 : 42;
  const days = Array.from({ length }, (_, i) => addDays(first, i));
  const endDate = addDays(first, length);
  return {
    days,
    start: resolveCampusLocal(`${first}T00:00`).instant!,
    end: resolveCampusLocal(`${endDate}T00:00`).instant!,
  };
}
export function overlaps(
  item: { starts_at: string; ends_at: string | null },
  start: string,
  end: string,
) {
  return (
    Date.parse(item.starts_at) < Date.parse(end) &&
    (item.ends_at
      ? Date.parse(item.ends_at) > Date.parse(start)
      : Date.parse(item.starts_at) >= Date.parse(start))
  );
}
export function compareCalendar(
  a: { starts_at: string; id: string },
  b: { starts_at: string; id: string },
) {
  return (
    Date.parse(a.starts_at) - Date.parse(b.starts_at) ||
    a.id.localeCompare(b.id)
  );
}
export function calendarCategory(item: {
  relationship: "hosting" | "joined" | "none";
}) {
  return item.relationship === "hosting"
    ? "hosting"
    : item.relationship === "joined"
      ? "attending"
      : "all";
}
export function selectedCategory(
  item: { relationship: "hosting" | "joined" | "none" },
  selection: CalendarSelection,
) {
  return selection[calendarCategory(item)];
}

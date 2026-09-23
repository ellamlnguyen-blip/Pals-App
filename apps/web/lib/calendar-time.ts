import { campusLocal, resolveCampusLocal } from "./hangout-time.ts";

export type CalendarSelection = {
  date: string;
  view: "day" | "week";
  filter: "discoverable" | "joined" | "hosting";
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
    ["day", "week"].includes(input.view) &&
    ["discoverable", "joined", "hosting"].includes(input.filter)
  );
}
export function calendarRange(selection: CalendarSelection) {
  const weekday = new Date(`${selection.date}T12:00:00Z`).getUTCDay();
  const first =
    selection.view === "week"
      ? addDays(selection.date, -((weekday + 6) % 7))
      : selection.date;
  const days = Array.from(
    { length: selection.view === "week" ? 7 : 1 },
    (_, i) => addDays(first, i),
  );
  const endDate = addDays(first, days.length);
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

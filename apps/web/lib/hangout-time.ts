export const CAMPUS_TIME_ZONE = "America/New_York";
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function campusLocal(instant: string): string {
  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(instant))
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
export function resolveCampusLocal(local: string): {
  instant?: string;
  error?: string;
} {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local))
    return { error: "Choose a campus date and time." };
  const matches = ["-04:00", "-05:00"]
    .map((offset) => new Date(`${local}:00${offset}`))
    .filter(
      (date) =>
        !Number.isNaN(date.getTime()) &&
        campusLocal(date.toISOString()) === local,
    );
  if (matches.length !== 1)
    return {
      error: matches.length
        ? "That campus time occurs twice when clocks change. Choose another time."
        : "That campus time does not exist when clocks change. Choose another time.",
    };
  return { instant: matches[0].toISOString() };
}

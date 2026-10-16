/** Display only; stored instants and the campus time zone stay unchanged. */
export function formatHangoutDateTime(instant: string): string {
  const date = new Date(instant);
  const options = { timeZone: "America/New_York" } as const;
  const day = new Intl.DateTimeFormat("en-US", {
    ...options,
    dateStyle: "medium",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    ...options,
    timeStyle: "short",
  }).format(date);
  return `${day} · ${time} ET`;
}

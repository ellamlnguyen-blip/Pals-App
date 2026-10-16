export type CalendarPreviewIdentities = Record<
  string,
  { name: string; photoRevision: number | null }
>;

/** Compare the authorized identity set and values, independent of RPC completion order. */
export function sameCalendarPreviewIdentities(
  before: CalendarPreviewIdentities,
  after: CalendarPreviewIdentities,
) {
  const beforeIds = Object.keys(before).sort();
  const afterIds = Object.keys(after).sort();
  if (
    beforeIds.length !== afterIds.length ||
    beforeIds.some((id, index) => id !== afterIds[index])
  )
    return false;
  return beforeIds.every(
    (id) =>
      before[id].name === after[id].name &&
      before[id].photoRevision === after[id].photoRevision,
  );
}

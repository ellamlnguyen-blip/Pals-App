const zone = "America/New_York";
export const CALENDAR_HOUR_PX = 48;

export type TimedItem = {
  id: string;
  starts_at: string;
  ends_at: string | null;
};

export function campusDate(date: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
}

export function campusMinutes(date: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(date));
  return (
    Number(parts.find((p) => p.type === "hour")?.value) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value)
  );
}

export function occursOnDay(item: TimedItem, day: string) {
  const begins = campusDate(item.starts_at);
  if (!item.ends_at) return begins === day;
  const ends = campusDate(item.ends_at);
  return (
    begins <= day &&
    (ends > day || (ends === day && campusMinutes(item.ends_at) > 0))
  );
}

export function segmentOnDay(item: TimedItem, day: string) {
  const startsHere = campusDate(item.starts_at) === day;
  const start = startsHere ? campusMinutes(item.starts_at) : 0;
  const endsHere = item.ends_at && campusDate(item.ends_at) === day;
  const end = endsHere
    ? campusMinutes(item.ends_at!)
    : item.ends_at
      ? 1440
      : Math.min(start + 60, 1440);
  return {
    start,
    end: Math.min(1440, Math.max(start + 55, end)),
    spans: !startsHere || (!!item.ends_at && !endsHere),
  };
}

export function visibleHours(items: TimedItem[], days: string[]) {
  let first = 8;
  let last = 21;
  for (const day of days) {
    for (const item of items) {
      if (!occursOnDay(item, day)) continue;
      const segment = segmentOnDay(item, day);
      first = Math.min(first, Math.floor(segment.start / 60));
      last = Math.max(last, Math.ceil(segment.end / 60));
    }
  }
  return { first, last: Math.min(24, last) };
}

export function layoutDay(items: TimedItem[], day: string, firstHour: number) {
  const ordered = items
    .filter((item) => occursOnDay(item, day))
    .map((item) => ({
      item,
      ...segmentOnDay(item, day),
      lane: 0,
      lanes: 1,
      cluster: 0,
    }))
    .sort(
      (a, b) =>
        a.start - b.start ||
        a.end - b.end ||
        a.item.id.localeCompare(b.item.id),
    );
  const laneEnds: number[] = [];
  let cluster = -1;
  let clusterEnd = -1;
  for (const event of ordered) {
    if (event.start >= clusterEnd) {
      cluster++;
      clusterEnd = -1;
      laneEnds.length = 0;
    }
    event.cluster = cluster;
    event.lane = laneEnds.findIndex((end) => end <= event.start);
    if (event.lane < 0) event.lane = laneEnds.length;
    laneEnds[event.lane] = event.end;
    clusterEnd = Math.max(clusterEnd, event.end);
  }
  for (const event of ordered) {
    event.lanes = Math.max(
      ...ordered
        .filter((other) => other.cluster === event.cluster)
        .map((other) => other.lane + 1),
    );
  }
  return ordered.map(({ item, start, end, spans, lane, lanes }) => ({
    item,
    spans,
    top: ((start - firstHour * 60) / 60) * CALENDAR_HOUR_PX,
    height: Math.max(44, ((end - start) / 60) * CALENDAR_HOUR_PX),
    left: `${(lane / lanes) * 100}%`,
    width: `${100 / lanes}%`,
  }));
}

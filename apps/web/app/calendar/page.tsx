import { Frame } from "../components";
import { requireAccess } from "../../lib/access";
import { requireLocalHangouts } from "../../lib/hangouts";
import { queryCalendar } from "../../lib/calendar";
import {
  calendarRange,
  campusToday,
  validSelection,
  type CalendarSelection,
} from "../../lib/calendar-time";
import { CalendarRefresh } from "./refresh";
import { CalendarClient } from "./calendar-client";
import { AnalyticsView } from "../analytics-view";
import "./calendar.css";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  requireLocalHangouts();
  await requireAccess("ready");
  const params = await searchParams;
  // Old bookmarked single-filter URLs retain their meaning.
  const legacy = typeof params.filter === "string" ? params.filter : null;
  const selection: CalendarSelection = {
    date: typeof params.date === "string" ? params.date : campusToday(),
    view:
      typeof params.view === "string"
        ? (params.view as CalendarSelection["view"])
        : "week",
    hosting: legacy
      ? legacy === "hosting" || legacy === "joined"
      : params.h === undefined
        ? true
        : params.h === "1",
    attending: legacy
      ? legacy === "joined"
      : params.a === undefined
        ? true
        : params.a === "1",
    all: legacy
      ? legacy === "discoverable"
      : params.o === undefined
        ? true
        : params.o === "1",
  };
  if (
    !validSelection(selection) ||
    (legacy && !["hosting", "joined", "discoverable"].includes(legacy))
  )
    return (
      <Frame signedIn navigation>
        <div className="calendar-empty" role="alert">
          <h1>Choose a valid Calendar view</h1>
          <a href="/calendar">Return to Today</a>
        </div>
      </Frame>
    );
  const range = calendarRange(selection);
  const result = await queryCalendar(selection);
  return (
    <Frame signedIn navigation>
      <CalendarRefresh />
      {result.kind !== "ok" ? (
        <div className="calendar-empty" role="alert">
          <h1>Calendar unavailable</h1>
          <p>Check your account and reload to see current plans.</p>
          <a href="/calendar">Reload Calendar</a>
        </div>
      ) : (
        <>
          <AnalyticsView event="calendar_viewed" />
          <CalendarClient
            selection={selection}
            days={range.days}
            items={result.items}
            truncated={result.truncated}
          />
        </>
      )}
    </Frame>
  );
}

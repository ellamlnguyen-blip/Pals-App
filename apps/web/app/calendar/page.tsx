import { Frame } from "../components";
import { requireAccess } from "../../lib/access";
import { requireLocalHangouts } from "../../lib/hangouts";
import { queryCalendar } from "../../lib/calendar";
import {
  addDays,
  calendarRange,
  campusToday,
  MAX_CALENDAR_DATE,
  MIN_CALENDAR_DATE,
  overlaps,
  validSelection,
  type CalendarSelection,
} from "../../lib/calendar-time";
import { CAMPUS_TIME_ZONE } from "../../lib/hangout-time";
import { CalendarRefresh } from "./refresh";
import "../hangouts/map.css";
import "./calendar.css";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const timeLabel = (instant: string) =>
  new Date(instant).toLocaleString("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
function url(selection: CalendarSelection) {
  return `/calendar?${new URLSearchParams(selection)}`;
}
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  requireLocalHangouts();
  await requireAccess("ready");
  const params = await searchParams;
  const selection = {
    date: params.date ?? campusToday(),
    view: params.view ?? "day",
    filter: params.filter ?? "discoverable",
  };
  if (!validSelection(selection))
    return (
      <Frame signedIn>
        <h1>Calendar</h1>
        <p role="alert">
          Choose a valid campus date, Day or Week view, and Hangout filter.
        </p>
        <a href="/calendar">Return to Today</a>
      </Frame>
    );
  const range = calendarRange(selection);
  const result = await queryCalendar(selection);
  const step = selection.view === "week" ? 7 : 1;
  const previous = addDays(selection.date, -step),
    next = addDays(selection.date, step);
  return (
    <Frame signedIn>
      <CalendarRefresh />
      <nav className="primary-nav" aria-label="Primary">
        <a href="/hangouts">Hangouts</a>
        <a href="/calendar" aria-current="page">
          Calendar
        </a>
        {["People", "Chats", "Notifications"].map((name) => (
          <span key={name} aria-label={`${name}, coming later`}>
            {name}
          </span>
        ))}
      </nav>
      <section className="calendar-page" aria-labelledby="calendar-title">
        <div className="calendar-heading">
          <div>
            <p className="badge">Saved Hangouts · local only</p>
            <h1 id="calendar-title">Make time for a Hangout</h1>
            <p>See what’s happening, or find the plans you’ve joined.</p>
          </div>
          <a className="button" href="/hangouts/new">
            + Create Hangout
          </a>
        </div>
        <form className="calendar-controls" action="/calendar" method="get">
          <label>
            Campus date
            <input
              name="date"
              type="date"
              min={MIN_CALENDAR_DATE}
              max={MAX_CALENDAR_DATE}
              defaultValue={selection.date}
              required
            />
          </label>
          <label>
            View
            <select name="view" defaultValue={selection.view}>
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>
          </label>
          <label>
            Hangouts
            <select name="filter" defaultValue={selection.filter}>
              <option value="discoverable">Discoverable</option>
              <option value="joined">Joined</option>
              <option value="hosting">Hosting</option>
            </select>
          </label>
          <button className="button">Show plans</button>
        </form>
        <div className="calendar-navigation" aria-label="Date navigation">
          {previous >= MIN_CALENDAR_DATE && (
            <a
              className="quiet-button"
              href={url({ ...selection, date: previous })}
            >
              ← Previous {selection.view}
            </a>
          )}
          <a
            className="quiet-button"
            href={url({ ...selection, date: campusToday() })}
          >
            Today
          </a>
          {next <= MAX_CALENDAR_DATE && (
            <a
              className="quiet-button"
              href={url({ ...selection, date: next })}
            >
              Next {selection.view} →
            </a>
          )}
        </div>
        <h2>
          {dayLabel(range.days[0])}
          {selection.view === "week" ? ` – ${dayLabel(range.days[6])}` : ""}
        </h2>
        <p className="help">
          {selection.filter === "discoverable"
            ? "Discoverable campus Hangouts"
            : selection.filter === "joined"
              ? "Your joined Hangouts, including plans you host"
              : "Hangouts you host"}{" "}
          · America/New_York. Weeks run Monday–Sunday.
        </p>
        {result.kind !== "ok" ? (
          <div role="alert" className="calendar-empty">
            <h3>
              {result.kind === "denied"
                ? "Calendar access unavailable"
                : "We couldn’t load these plans"}
            </h3>
            <p>
              Check your account and reload to try again. No saved results are
              shown.
            </p>
            <a href={url(selection)}>Reload Calendar</a>
          </div>
        ) : (
          <>
            {result.truncated && (
              <p role="status" className="fixture-notice">
                Showing the first 100 matching Hangouts, ordered by start time
                then ID. More match this range; choose a day or another filter
                to narrow it.
              </p>
            )}
            {!result.items.length ? (
              <div className="calendar-empty">
                <h3>No Hangouts in this view</h3>
                <p>Try another date or filter, or make a plan of your own.</p>
              </div>
            ) : (
              range.days.map((day) => {
                const interval = calendarRange({
                  ...selection,
                  date: day,
                  view: "day",
                });
                const items = result.items.filter((item) =>
                  overlaps(item, interval.start, interval.end),
                );
                return (
                  <section
                    className="calendar-day"
                    key={day}
                    aria-label={dayLabel(day)}
                  >
                    <h3>{dayLabel(day)}</h3>
                    {!items.length ? (
                      <p className="help">No matching Hangouts.</p>
                    ) : (
                      <ul>
                        {items.map((item) => (
                          <li key={item.id}>
                            <div>
                              <a
                                className="calendar-title"
                                href={`/hangouts/saved/${item.id}`}
                              >
                                {item.title}
                              </a>
                              <p>
                                {timeLabel(item.starts_at)}
                                {item.ends_at
                                  ? ` – ${timeLabel(item.ends_at)}`
                                  : " · End not set"}
                              </p>
                              <p>
                                {item.public_place} · Approximate public area
                              </p>
                            </div>
                            <div className="calendar-labels">
                              {item.status === "cancelled" && (
                                <strong>Cancelled</strong>
                              )}
                              {item.relationship !== "none" && (
                                <span>
                                  {item.relationship === "hosting"
                                    ? "Hosting · Joined"
                                    : "Joined"}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })
            )}
            <p className="help">
              Plans with an end appear on each day they overlap; plans without
              an end appear only on their start day. Times describe the
              schedule, not confirmed attendance.
            </p>
          </>
        )}
      </section>
    </Frame>
  );
}

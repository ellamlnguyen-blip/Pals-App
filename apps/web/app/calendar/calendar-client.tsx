"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { changeSavedMembership } from "../hangouts/saved/actions";
import {
  addDays,
  addMonths,
  calendarCategory,
  campusToday,
  MAX_CALENDAR_DATE,
  MIN_CALENDAR_DATE,
  type CalendarSelection,
} from "../../lib/calendar-time";

type Item = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  public_place: string;
  status: string;
  relationship: "hosting" | "joined" | "none";
};
type Preview = {
  kind: "ok";
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  publicPlace: string;
  status: string;
  joining: string;
  ownState: string;
  canJoin: boolean;
  people: { role: string; name: string | null; photo: string | null }[];
  morePeople: boolean;
};
const zone = "America/New_York";
const dayText = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    ...options,
  });
const stamp = (date: string) =>
  new Date(date).toLocaleString("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
const clock = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  });
function wallMinutes(date: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(date));
  return (
    Number(parts.find((part) => part.type === "hour")?.value) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value)
  );
}
function dateOf(date: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
}
function itemSpan(item: Item, day: string) {
  const start =
    dateOf(item.starts_at) === day ? wallMinutes(item.starts_at) : 0;
  const end =
    item.ends_at && dateOf(item.ends_at) === day
      ? wallMinutes(item.ends_at)
      : item.ends_at
        ? 1440
        : Math.min(start + 60, 1440);
  return {
    top: start / 2,
    height: Math.max(32, (end - start) / 2),
    spans:
      dateOf(item.starts_at) !== day ||
      (!!item.ends_at && dateOf(item.ends_at) !== day),
  };
}
function onDay(item: Item, day: string) {
  const begins = dateOf(item.starts_at);
  if (!item.ends_at) return begins === day;
  const ends = dateOf(item.ends_at);
  return (
    begins <= day &&
    (ends > day || (ends === day && wallMinutes(item.ends_at) > 0))
  );
}
export function CalendarClient({
  selection,
  days,
  items,
  truncated,
}: {
  selection: CalendarSelection;
  days: string[];
  items: Item[];
  truncated: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [joinMessage, setJoinMessage] = useState("");
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const request = useRef<AbortController | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<string | null>(null);
  function href(next: CalendarSelection) {
    return `/calendar?${new URLSearchParams({ date: next.date, view: next.view, h: next.hosting ? "1" : "0", a: next.attending ? "1" : "0", o: next.all ? "1" : "0" })}`;
  }
  function go(next: CalendarSelection) {
    close();
    router.push(href(next));
  }
  function close() {
    request.current?.abort();
    activeRef.current = null;
    setActive(null);
    setPreview(null);
    setJoinMessage("");
  }
  function deferClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(close, 180);
  }
  function keepOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function show(id: string, element: HTMLElement) {
    keepOpen();
    const rect = element.getBoundingClientRect();
    setAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 420),
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 380)),
    });
    if (activeRef.current === id) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    activeRef.current = id;
    setActive(id);
    setPreview(null);
    setPreviewError(false);
    setJoinMessage("");
    fetch(`/api/calendar/${id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<Preview>;
      })
      .then((data) => {
        if (
          !controller.signal.aborted &&
          activeRef.current === id &&
          data.kind === "ok"
        )
          setPreview(data);
      })
      .catch(() => {
        if (!controller.signal.aborted && activeRef.current === id) {
          close();
          router.refresh();
        }
      });
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const outside = (event: PointerEvent) => {
      if (
        !(event.target as HTMLElement).closest(
          ".calendar-event, .calendar-preview",
        )
      )
        close();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("pointerdown", outside);
    const restore = () => {
      close();
      router.refresh();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("pageshow", restore);
      request.current?.abort();
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [router, pathname]);
  const step =
    selection.view === "month" ? null : selection.view === "week" ? 7 : 1;
  const previous = step
    ? addDays(selection.date, -step)
    : addMonths(selection.date, -1);
  const next = step
    ? addDays(selection.date, step)
    : addMonths(selection.date, 1);
  const label =
    selection.view === "month"
      ? dayText(selection.date, { month: "long", year: "numeric" })
      : selection.view === "week"
        ? `${dayText(days[0], { month: "long", day: "numeric" })}–${dayText(days[6], { month: "long", day: "numeric", year: "numeric" })}`
        : dayText(selection.date, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });
  const now = campusToday();
  const renderEvent = (item: Item, className = "") => (
    <button
      key={item.id}
      type="button"
      className={`calendar-event calendar-${calendarCategory(item)} ${className}`}
      onPointerEnter={(event) => show(item.id, event.currentTarget)}
      onPointerLeave={deferClose}
      onFocus={(event) => show(item.id, event.currentTarget)}
      onClick={(event) => show(item.id, event.currentTarget)}
      aria-haspopup="dialog"
      aria-expanded={active === item.id}
    >
      <span>{clock(item.starts_at)}</span>
      <strong>{item.title}</strong>
      {item.status === "cancelled" && <em>Cancelled</em>}
    </button>
  );
  return (
    <div className="calendar-page">
      <div className="calendar-top">
        <h1>Calendar</h1>
        <div className="calendar-tabs" role="group" aria-label="Calendar view">
          {(["day", "week", "month"] as const).map((view) => (
            <button
              key={view}
              className={selection.view === view ? "is-active" : ""}
              onClick={() => go({ ...selection, view })}
              aria-pressed={selection.view === view}
            >
              {view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <fieldset className="calendar-legend">
        <legend className="sr-only">Show Hangouts</legend>
        {(
          [
            ["hosting", "Hosting"],
            ["attending", "Attending"],
            ["all", "All hangouts"],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className={`calendar-legend-${key}`}>
            <input
              type="checkbox"
              checked={selection[key]}
              onChange={(event) =>
                go({ ...selection, [key]: event.target.checked })
              }
            />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>
      <div className="calendar-toolbar">
        <div className="calendar-date-actions">
          {previous >= MIN_CALENDAR_DATE && (
            <button
              aria-label={`Previous ${selection.view}`}
              onClick={() => go({ ...selection, date: previous })}
            >
              ‹
            </button>
          )}
          <button onClick={() => go({ ...selection, date: now })}>Today</button>
          {next <= MAX_CALENDAR_DATE && (
            <button
              aria-label={`Next ${selection.view}`}
              onClick={() => go({ ...selection, date: next })}
            >
              ›
            </button>
          )}
        </div>
        <h2>{label}</h2>
        <label className="calendar-picker">
          Campus date{" "}
          <input
            aria-label="Choose campus date"
            type="date"
            min={MIN_CALENDAR_DATE}
            max={MAX_CALENDAR_DATE}
            value={selection.date}
            onChange={(event) => {
              if (event.target.value)
                go({ ...selection, date: event.target.value });
            }}
          />
        </label>
      </div>
      {truncated && (
        <p role="status" className="fixture-notice">
          Showing the first 100 matching Hangouts. Choose a shorter range to see
          more.
        </p>
      )}
      {!selection.hosting && !selection.attending && !selection.all ? (
        <div className="calendar-empty">
          <h3>No categories selected</h3>
          <p>Choose a category to see Hangouts.</p>
        </div>
      ) : !items.length ? (
        <div className="calendar-empty">
          <h3>No Hangouts in this view</h3>
          <p>Try another date or category.</p>
        </div>
      ) : null}
      {selection.view === "month" ? (
        <div className="calendar-month" role="grid" aria-label={label}>
          <div className="calendar-month-head">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-month-days">
            {days.map((day) => (
              <div
                key={day}
                role="gridcell"
                className={
                  day.slice(0, 7) !== selection.date.slice(0, 7)
                    ? "is-outside"
                    : ""
                }
              >
                <time dateTime={day} className={day === now ? "is-today" : ""}>
                  {dayText(day, { day: "numeric" })}
                </time>
                {items
                  .filter((item) => onDay(item, day))
                  .map((item) => renderEvent(item))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="calendar-grid-viewport">
          <div
            className={`calendar-time-grid ${selection.view === "day" ? "calendar-one-day" : ""}`}
            style={{
              gridTemplateColumns: `72px repeat(${days.length}, minmax(${selection.view === "day" ? 240 : 150}px, 1fr))`,
            }}
          >
            <div className="calendar-corner" />
            <div
              className="calendar-day-heads"
              style={{
                gridColumn: `2 / span ${days.length}`,
                gridTemplateColumns: `repeat(${days.length}, minmax(${selection.view === "day" ? 240 : 150}px, 1fr))`,
              }}
            >
              {days.map((day) => (
                <div key={day}>
                  <time
                    dateTime={day}
                    className={day === now ? "is-today" : ""}
                  >
                    {dayText(day, { weekday: "short", day: "numeric" })}
                  </time>
                </div>
              ))}
            </div>
            <div className="calendar-hours">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour}>
                  {new Date(Date.UTC(2020, 0, 1, hour)).toLocaleTimeString(
                    "en-US",
                    { timeZone: "UTC", hour: "numeric" },
                  )}
                </div>
              ))}
            </div>
            {days.map((day) => (
              <div className="calendar-time-day" key={day}>
                {items
                  .filter((item) => onDay(item, day))
                  .map((item, index) => {
                    const span = itemSpan(item, day);
                    return (
                      <div
                        className="calendar-time-event"
                        key={item.id}
                        style={{
                          top: span.top,
                          height: span.height,
                          left: `${(index % 2) * 7}%`,
                          right: `${((index + 1) % 2) * 7}%`,
                        }}
                      >
                        {renderEvent(item, span.spans ? "is-spanning" : "")}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="calendar-note">
        Times are in America/New_York. Multi-day plans continue across the days
        they span; plans without an end appear on their start day.
      </p>
      {active && (
        <div
          className="calendar-preview"
          role="dialog"
          aria-label="Hangout preview"
          style={{ top: Math.max(12, anchor.top), left: anchor.left }}
          onPointerEnter={keepOpen}
          onPointerLeave={deferClose}
        >
          <button
            className="calendar-preview-close"
            onClick={close}
            aria-label="Close preview"
          >
            ×
          </button>
          {preview ? (
            <>
              <h3>{preview.title}</h3>
              {preview.status === "cancelled" && (
                <strong className="calendar-cancelled">Cancelled</strong>
              )}
              <div className="calendar-preview-people">
                {preview.people
                  .filter((person) => person.role !== "participant")
                  .map((person, index) => (
                    <div key={index}>
                      {person.photo ? (
                        <Image
                          src={person.photo}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                        />
                      ) : (
                        <span className="calendar-avatar">
                          {person.role === "host" ? "Host" : "Co"}
                        </span>
                      )}
                      <span>
                        <strong>{person.name ?? "Pal"}</strong>
                        <small>
                          {person.role === "host" ? "Host" : "Co-host"}
                        </small>
                      </span>
                    </div>
                  ))}
              </div>
              {preview.people.some(
                (person) => person.role === "participant",
              ) && (
                <>
                  <strong className="calendar-attendees-label">
                    Pals attending
                  </strong>
                  <div className="calendar-attendees">
                    {preview.people
                      .filter((person) => person.role === "participant")
                      .slice(0, 6)
                      .map((person, index) =>
                        person.photo ? (
                          <Image
                            key={index}
                            src={person.photo}
                            alt={person.name ?? "Attendee"}
                            width={40}
                            height={40}
                            unoptimized
                          />
                        ) : (
                          <span
                            key={index}
                            className="calendar-avatar"
                            title={person.name ?? "Pal"}
                          >
                            {person.name?.slice(0, 1) ?? "Pal"}
                          </span>
                        ),
                      )}
                    {preview.morePeople && (
                      <span className="calendar-more">More</span>
                    )}
                  </div>
                </>
              )}
              <p>
                <strong>{stamp(preview.startsAt)}</strong>
                {preview.endsAt && ` to ${stamp(preview.endsAt)}`}
              </p>
              <p>
                ⌖ {preview.publicPlace} <small>Approximate public area</small>
              </p>
              {preview.description && <p>{preview.description}</p>}
              <div className="calendar-preview-actions">
                <Link href={`/hangouts/saved/${preview.id}`}>View Hangout</Link>
                {preview.canJoin && (
                  <button
                    disabled={pending}
                    onClick={() => {
                      setJoinMessage("");
                      startTransition(async () => {
                        try {
                          const result = await changeSavedMembership(
                            preview.id,
                            "join",
                          );
                          setJoinMessage(result.message);
                          if (result.kind === "saved") {
                            close();
                            router.refresh();
                          } else {
                            request.current?.abort();
                            setPreview(null);
                            setPreviewError(true);
                          }
                        } catch {
                          setJoinMessage(
                            "Outcome uncertain. Reload this Hangout before trying again.",
                          );
                          setPreview(null);
                          setPreviewError(true);
                        }
                      });
                    }}
                  >
                    {pending ? "Joining…" : "Join"}
                  </button>
                )}
              </div>
              {joinMessage && <p role="status">{joinMessage}</p>}
            </>
          ) : (
            <p role="status">
              {previewError
                ? "Preview unavailable. Open the Hangout to check current access."
                : "Checking current Hangout access…"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
import {
  CALENDAR_HOUR_PX,
  layoutDay,
  occursOnDay,
  visibleHours,
} from "../../lib/calendar-layout";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../auth-transition";

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
  rosterPageAtLimit: boolean;
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
  const [concealed, setConcealed] = useState(false);
  const request = useRef<AbortController | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const suppressFocus = useRef(false);
  const concealedRef = useRef(false);
  const generation = useRef(0);
  const authPending = useRef(false);
  function href(next: CalendarSelection) {
    return `/calendar?${new URLSearchParams({ date: next.date, view: next.view, h: next.hosting ? "1" : "0", a: next.attending ? "1" : "0", o: next.all ? "1" : "0" })}`;
  }
  function go(next: CalendarSelection) {
    close();
    router.push(href(next));
  }
  function close(returnFocus = false) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    request.current?.abort();
    generation.current++;
    activeRef.current = null;
    setActive(null);
    setPreview(null);
    setJoinMessage("");
    if (returnFocus && triggerRef.current?.isConnected) {
      suppressFocus.current = true;
      triggerRef.current.focus();
    }
  }
  function deferClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (!previewRef.current?.contains(document.activeElement)) close();
    }, 180);
  }
  function keepOpen() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function show(id: string, element: HTMLElement) {
    if (concealedRef.current) return;
    keepOpen();
    triggerRef.current = element;
    const rect = element.getBoundingClientRect();
    setAnchor({
      top: Math.min(rect.bottom + 8, window.innerHeight - 420),
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 380)),
    });
    if (activeRef.current === id) return;
    request.current?.abort();
    generation.current++;
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
      if (event.key === "Escape" && activeRef.current) close(true);
    };
    const outside = (event: PointerEvent) => {
      if (
        !(event.target as HTMLElement).closest(
          ".calendar-event, .calendar-preview",
        )
      )
        close();
    };
    const focusOutside = (event: FocusEvent) => {
      const target = event.target;
      if (
        activeRef.current &&
        target instanceof Node &&
        !previewRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      )
        close();
    };
    const conceal = () => {
      concealedRef.current = true;
      close();
      setConcealed(true);
    };
    const auth = (message: AuthTransitionMessage) => {
      conceal();
      if (message.phase === "begin") authPending.current = true;
      else {
        authPending.current = false;
        if (!document.hidden) window.location.reload();
      }
    };
    const localAuth = (event: Event) =>
      auth((event as CustomEvent<AuthTransitionMessage>).detail);
    const visibility = () => {
      if (document.hidden) conceal();
      else if (!authPending.current && concealed) window.location.reload();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    window.addEventListener(AUTH_TRANSITION_EVENT, localAuth);
    window.addEventListener("pagehide", conceal);
    document.addEventListener("visibilitychange", visibility);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
      channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
        auth(event.data);
    } catch {
      /* Local event and page lifecycle still conceal data. */
    }
    const restore = () => {
      if (concealed && !authPending.current) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    const pendingGeneration = generation;
    const currentActive = activeRef;
    const currentRequest = request;
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focusOutside);
      window.removeEventListener(AUTH_TRANSITION_EVENT, localAuth);
      window.removeEventListener("pagehide", conceal);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", restore);
      channel?.close();
      pendingGeneration.current++;
      currentActive.current = null;
      currentRequest.current?.abort();
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [router, pathname, concealed]);
  const hours = visibleHours(items, days);
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
      onFocus={(event) => {
        if (!suppressFocus.current) show(item.id, event.currentTarget);
      }}
      onBlur={() => {
        suppressFocus.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          show(item.id, event.currentTarget);
          requestAnimationFrame(() => closeRef.current?.focus());
        }
      }}
      onClick={(event) => {
        show(item.id, event.currentTarget);
        requestAnimationFrame(() => closeRef.current?.focus());
      }}
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
      {!concealed && selection.view !== "day" && (
        <p className={`calendar-pan-hint calendar-pan-hint-${selection.view}`}>
          Scroll sideways to see all seven days.
        </p>
      )}
      {concealed ? (
        <div className="calendar-empty" role="status">
          Checking current Calendar access…
        </div>
      ) : selection.view === "month" ? (
        <div
          className="calendar-month-viewport"
          role="region"
          aria-label="Calendar month scroll area"
          tabIndex={0}
        >
          <div className="calendar-month" role="group" aria-label={label}>
            <div className="calendar-month-head">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="calendar-month-days">
              {days.map((day) => (
                <div
                  key={day}
                  role="group"
                  aria-label={dayText(day, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  className={
                    day.slice(0, 7) !== selection.date.slice(0, 7)
                      ? "is-outside"
                      : ""
                  }
                >
                  <time
                    dateTime={day}
                    className={day === now ? "is-today" : ""}
                  >
                    {dayText(day, { day: "numeric" })}
                  </time>
                  {items
                    .filter((item) => occursOnDay(item, day))
                    .map((item) => renderEvent(item))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="calendar-grid-viewport"
          role={selection.view === "week" ? "region" : undefined}
          aria-label={
            selection.view === "week" ? "Calendar week scroll area" : undefined
          }
          tabIndex={selection.view === "week" ? 0 : undefined}
        >
          <div
            className={`calendar-time-grid ${selection.view === "day" ? "calendar-one-day" : ""}`}
            style={{
              gridTemplateColumns: `72px repeat(${days.length}, minmax(${selection.view === "day" ? 240 : 150}px, 1fr))`,
              gridTemplateRows: `52px ${(hours.last - hours.first) * CALENDAR_HOUR_PX}px`,
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
              {Array.from({ length: hours.last - hours.first }, (_, index) => (
                <div key={index}>
                  {new Date(
                    Date.UTC(2020, 0, 1, hours.first + index),
                  ).toLocaleTimeString("en-US", {
                    timeZone: "UTC",
                    hour: "numeric",
                  })}
                </div>
              ))}
            </div>
            {days.map((day) => (
              <div className="calendar-time-day" key={day}>
                {layoutDay(items, day, hours.first).map((span) => {
                  const item = span.item as Item;
                  return (
                    <div
                      className="calendar-time-event"
                      key={item.id}
                      style={{
                        top: span.top,
                        height: span.height,
                        left: span.left,
                        width: span.width,
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
      {!concealed && active && (
        <div
          ref={previewRef}
          className="calendar-preview"
          role="dialog"
          aria-label="Hangout preview"
          style={{ top: Math.max(12, anchor.top), left: anchor.left }}
          onPointerEnter={keepOpen}
          onPointerLeave={deferClose}
        >
          <button
            ref={closeRef}
            className="calendar-preview-close"
            onClick={() => close(true)}
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
                    {(preview.rosterPageAtLimit ||
                      preview.people.filter(
                        (person) => person.role === "participant",
                      ).length > 6) && (
                      <Link
                        href={`/hangouts/saved/${preview.id}`}
                        className="calendar-more"
                        onClick={() => close()}
                      >
                        View attendees
                      </Link>
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
                <Link
                  href={`/hangouts/saved/${preview.id}`}
                  onClick={() => close()}
                >
                  View Hangout
                </Link>
                {preview.canJoin && (
                  <button
                    disabled={pending}
                    onClick={() => {
                      setJoinMessage("");
                      const currentGeneration = generation.current;
                      startTransition(async () => {
                        try {
                          const result = await changeSavedMembership(
                            preview.id,
                            "join",
                          );
                          if (currentGeneration !== generation.current) return;
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
                          if (currentGeneration !== generation.current) return;
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

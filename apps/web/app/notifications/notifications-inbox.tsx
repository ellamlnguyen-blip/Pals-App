"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../auth-transition";
import {
  notificationDestination,
  type NotificationRow,
} from "../../lib/notification-destination";
import {
  notificationProbeState,
  notificationTransitionState,
} from "./notification-auth-state";
import { AnalyticsView } from "../analytics-view";
import { ArrowClockwise } from "@phosphor-icons/react";
import {
  NOTIFICATION_ATTENTION_CHANNEL,
  NOTIFICATION_OPEN_EVENT,
} from "../student-shell";
type Cursor = { time: string; id: string } | null;
type Preference = { category: string; enabled: boolean };
const categoryCopy: Record<string, { name: string; description: string }> = {
  social_requests: {
    name: "Friend requests",
    description: "New requests and acceptances",
  },
  messages: {
    name: "Messages",
    description: "Direct and Hangout conversations",
  },
  hangout_updates: {
    name: "Hangout updates",
    description: "Changes to plans you joined",
  },
  host_activity: {
    name: "Host activity",
    description: "People joining or leaving your Hangouts",
  },
};
const categoryOrder = [
  "social_requests",
  "messages",
  "hangout_updates",
  "host_activity",
];
const idPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
function refreshAttention() {
  window.dispatchEvent(new Event(NOTIFICATION_ATTENTION_CHANNEL));
  const channel = new BroadcastChannel(NOTIFICATION_ATTENTION_CHANNEL);
  channel.postMessage("refresh");
  channel.close();
}
export function NotificationsInbox({ actor }: { actor: string }) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [phase, setPhase] = useState<
    "loading" | "ready" | "denied" | "error" | "uncertain"
  >("loading");
  const [message, setMessage] = useState("");
  const [attentionError, setAttentionError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    cutoff: string;
    revision: number;
  } | null>(null);
  const cursors = useRef<Cursor[]>([null]);
  const revision = useRef(0);
  const pending = useRef(new Set<string>());
  const settled = useRef(new Map<string, "settled" | "cancelled">());
  const denied = useRef(false);
  const more = rows.length === 24;
  const mask = useCallback(() => {
    revision.current++;
    setRows([]);
    setPreferences([]);
    setPhase("loading");
    setMessage("");
    setAttentionError(false);
    setSnapshot(null);
  }, []);
  const deny = useCallback(() => {
    denied.current = true;
    pending.current.clear();
    settled.current.clear();
    mask();
    setPhase("denied");
    setMessage(
      "Notifications are unavailable for this account. Check your access and reload.",
    );
  }, [mask]);
  const request = useCallback(
    (path: string, init?: RequestInit) =>
      fetch(`/api/notifications${path}`, {
        cache: "no-store",
        credentials: "same-origin",
        ...init,
        headers: {
          "x-pals-notification-actor": actor,
          ...(init?.headers ?? {}),
        },
      }),
    [actor],
  );
  const current = useCallback(
    (started: number) =>
      started === revision.current &&
      !document.hidden &&
      !pending.current.size &&
      !denied.current,
    [],
  );
  const read = useCallback(
    async (index: number, cursor: Cursor) => {
      if (document.hidden || pending.current.size || denied.current) return;
      mask();
      const started = revision.current;
      const params = cursor
        ? `?time=${encodeURIComponent(cursor.time)}&id=${cursor.id}`
        : "";
      try {
        // The probe checks the current cookie/account and gate before reading a page.
        const probe = await request("?probe=1");
        if (!current(started)) return;
        if (probe.status === 403) {
          deny();
          return;
        }
        const owner = await probe.json();
        if (!probe.ok || owner.kind !== "ok" || owner.actor !== actor)
          throw new Error("probe");
        const response = await request(params);
        if (!current(started)) return;
        if (response.status === 403) {
          deny();
          return;
        }
        const data = await response.json();
        if (!current(started)) return;
        if (
          !response.ok ||
          data.kind !== "ok" ||
          data.actor !== actor ||
          !Array.isArray(data.rows) ||
          !Array.isArray(data.preferences) ||
          typeof data.cutoff !== "string" ||
          !Number.isFinite(Date.parse(data.cutoff))
        )
          throw new Error("read");
        const safeRows = data.rows.filter(
          (row: NotificationRow) =>
            row &&
            idPattern.test(row.notification_id) &&
            typeof row.label === "string" &&
            typeof row.created_at === "string" &&
            Number.isFinite(Date.parse(row.created_at)) &&
            (row.read_at === null || typeof row.read_at === "string"),
        );
        if (safeRows.length !== data.rows.length || safeRows.length > 24)
          throw new Error("shape");
        cursors.current[index] = cursor;
        cursors.current.length = index + 1;
        setPage(index);
        setRows(safeRows);
        setPreferences(data.preferences);
        setPhase("ready");
        setSnapshot({ cutoff: data.cutoff, revision: started });
        setMessage("");
      } catch {
        if (current(started)) {
          setPhase("error");
          setMessage("Could not refresh Notifications. Reload or try again.");
        }
      }
    },
    [actor, current, deny, mask, request],
  );
  useEffect(() => {
    if (!snapshot || phase !== "ready") return;
    let cancelled = false;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(async () => {
        if (cancelled || !current(snapshot.revision)) return;
        try {
          const response = await request("", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "acknowledge",
              cutoff: snapshot.cutoff,
            }),
          });
          if (cancelled || !current(snapshot.revision)) return;
          if (response.status === 403) {
            deny();
            return;
          }
          const body = await response.json();
          if (cancelled || !current(snapshot.revision)) return;
          if (!response.ok || body.kind !== "ok" || body.actor !== actor) {
            setAttentionError(true);
            setSnapshot(null);
            refreshAttention();
            return;
          }
          setRows((items) =>
            items.map((item) =>
              !item.read_at &&
              Date.parse(item.created_at) <= Date.parse(snapshot.cutoff)
                ? { ...item, read_at: snapshot.cutoff }
                : item,
            ),
          );
          setAttentionError(false);
          refreshAttention();
          setSnapshot(null);
        } catch {
          if (cancelled || !current(snapshot.revision)) return;
          setAttentionError(true);
          setSnapshot(null);
          // A lost response may follow a committed write; recheck the server.
          refreshAttention();
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [actor, current, deny, phase, request, snapshot]);
  const resume = useCallback(() => {
    if (document.hidden || denied.current) return;
    if (pending.current.size) return;
    void read(page, cursors.current[page] ?? null);
  }, [page, read]);
  useEffect(() => {
    let mounted = true;
    const verify = async (token: string) => {
      if (!pending.current.has(token)) return;
      const started = revision.current;
      try {
        const probe = await request("?probe=1");
        if (
          !mounted ||
          started !== revision.current ||
          document.hidden ||
          !pending.current.has(token)
        )
          return;
        if (probe.status === 403) {
          deny();
          return;
        }
        const body = await probe.json();
        if (
          !mounted ||
          started !== revision.current ||
          document.hidden ||
          !pending.current.has(token)
        )
          return;
        const decision = notificationProbeState(
          pending.current,
          settled.current,
          token,
          probe.status,
          probe.ok && body.kind === "ok" && body.actor === actor,
        );
        if (decision === "read") void read(page, cursors.current[page] ?? null);
        else if (decision === "retry")
          for (const waiting of settled.current.keys()) void verify(waiting);
      } catch {
        /* Keep content masked until a later successful probe. */
      }
    };
    const retrySettled = () => {
      for (const token of settled.current.keys()) void verify(token);
    };
    const wake = () => {
      if (document.hidden) {
        mask();
        return;
      }
      mask();
      if (pending.current.size) retrySettled();
      else resume();
    };
    const transition = (event: AuthTransitionMessage) => {
      if (denied.current) return;
      const decision = notificationTransitionState(
        pending.current,
        settled.current,
        event,
      );
      if (decision === "mask") mask();
      else if (decision === "verify" && "token" in event) {
        mask();
        void verify(event.token);
      } else if (decision === "reauthorize") wake();
    };
    const local = (event: Event) =>
      transition((event as CustomEvent<AuthTransitionMessage>).detail);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
      transition(event.data);
    const visibility = () => wake();
    const storage = (event: StorageEvent) => {
      if (event.key?.includes("auth-token")) wake();
    };
    const open = () => {
      if (!document.hidden && !pending.current.size && !denied.current)
        void read(0, null);
    };
    wake();
    window.addEventListener(AUTH_TRANSITION_EVENT, local);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("pagehide", mask);
    window.addEventListener("storage", storage);
    window.addEventListener(NOTIFICATION_OPEN_EVENT, open);
    return () => {
      mounted = false;
      mask();
      channel.close();
      window.removeEventListener(AUTH_TRANSITION_EVENT, local);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("pagehide", mask);
      window.removeEventListener("storage", storage);
      window.removeEventListener(NOTIFICATION_OPEN_EVENT, open);
    };
  }, [actor, deny, mask, page, read, request, resume, retry]);
  const mutation = async (body: object) => {
    mask();
    const started = revision.current;
    try {
      const response = await request("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!current(started)) return;
      if (response.status === 403) {
        deny();
        return;
      }
      const data = await response.json();
      if (!current(started)) return;
      if (!response.ok || data.kind !== "ok") throw new Error("uncertain");
      await read(page, cursors.current[page] ?? null);
    } catch {
      if (current(started)) {
        setPhase("uncertain");
        setMessage(
          "The change could not be confirmed. Reload before trying again.",
        );
      }
    }
  };
  return (
    <div className="notifications-page">
      <AnalyticsView event="notifications_viewed" ready={phase === "ready"} />
      <h1 className="sr-only">Notifications</h1>
      <div className="notifications-layout">
        <section className="notifications-inbox" aria-labelledby="inbox-title">
          <div className="notifications-section-heading">
            <div>
              <h2 id="inbox-title" className="sr-only">
                Inbox
              </h2>
            </div>
            {phase === "ready" && (
              <button
                className="quiet-button notifications-refresh"
                aria-label="Refresh notifications"
                title="Refresh notifications"
                onClick={() => void read(page, cursors.current[page] ?? null)}
              >
                <ArrowClockwise size={20} aria-hidden="true" />
              </button>
            )}
          </div>
          {phase === "ready" && attentionError && (
            <p className="notification-attention-error" role="status">
              Could not mark updates as seen. Refresh to retry.
            </p>
          )}
          {phase === "loading" && (
            <div role="status" className="notifications-state">
              <p>Checking your Notifications…</p>
              <button
                className="quiet-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry account check
              </button>
            </div>
          )}
          {(phase === "error" ||
            phase === "denied" ||
            phase === "uncertain") && (
            <div role="alert" className="notifications-state">
              <p>{message}</p>
              {phase === "error" && (
                <button
                  className="quiet-button"
                  onClick={() => void read(page, cursors.current[page] ?? null)}
                >
                  Try again
                </button>
              )}
              {phase === "uncertain" && (
                <a href="/notifications">Reload Notifications</a>
              )}
            </div>
          )}
          {phase === "ready" &&
            (rows.length === 0 ? (
              <div className="notifications-state">
                <h3>No updates yet</h3>
                <p>Updates will appear when plans or conversations change.</p>
              </div>
            ) : (
              <ul className="notifications-list">
                {rows.map((row) => {
                  const destination = notificationDestination(row);
                  const label = destination
                    ? row.label
                    : row.label === "Unavailable"
                      ? "Unavailable"
                      : row.label;
                  return (
                    <li
                      key={row.notification_id}
                      className={row.read_at ? "" : "unread"}
                    >
                      <div className="notification-main">
                        <strong>{label}</strong>
                        <div className="notification-meta">
                          <time dateTime={row.created_at}>
                            {new Date(row.created_at).toLocaleString()}
                          </time>
                          <span>{row.read_at ? "Read" : "Unread"}</span>
                        </div>
                      </div>
                      <div className="notification-actions">
                        {destination && (
                          <a href={destination.href}>{destination.label}</a>
                        )}
                        {!row.read_at && (
                          <button
                            className="text-button"
                            onClick={() =>
                              void mutation({
                                action: "read",
                                id: row.notification_id,
                              })
                            }
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}
          {phase === "ready" && (
            <nav className="notification-pages" aria-label="Notification pages">
              <button
                className="quiet-button"
                disabled={page === 0}
                onClick={() => void read(page - 1, cursors.current[page - 1])}
              >
                Newer
              </button>
              <span>Page {page + 1}</span>
              <button
                className="quiet-button"
                disabled={!more}
                onClick={() => {
                  const last = rows.at(-1);
                  if (last)
                    void read(page + 1, {
                      time: last.created_at,
                      id: last.notification_id,
                    });
                }}
              >
                Older
              </button>
            </nav>
          )}
        </section>
        <section
          className="notification-preferences"
          aria-labelledby="preferences-title"
        >
          <h2 id="preferences-title">Preferences</h2>
          <p>
            Turn a category off to stop future optional inbox items. Existing
            items stay here, and requests, messages and Hangout actions still
            happen.
          </p>
          {phase === "ready" && (
            <div className="notification-options">
              {categoryOrder.map((category) => {
                const pref = preferences.find(
                  (item) => item.category === category,
                );
                return (
                  <label key={category} className="notification-option">
                    <span>
                      <strong>{categoryCopy[category].name}</strong>
                      <small>{categoryCopy[category].description}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={pref?.enabled ?? true}
                      onChange={(event) =>
                        void mutation({
                          action: "preference",
                          category,
                          enabled: event.target.checked,
                        })
                      }
                    />
                  </label>
                );
              })}
            </div>
          )}
          <p className="notification-essential">
            Hangout cancellations still arrive when updates are off.
          </p>
        </section>
      </div>
    </div>
  );
}

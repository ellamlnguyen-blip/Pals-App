"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../../auth-transition";

const options = [
  {
    category: "campus_new_hangout",
    name: "New campus Hangouts",
    description: "New Hangouts you can discover on campus.",
  },
  {
    category: "friend_created_hangout",
    name: "Hangouts friends create",
    description:
      "New Hangouts created by your friends when you can discover them.",
  },
  {
    category: "friend_joined_hangout",
    name: "Hangouts friends join",
    description: "Hangouts your friends join when you can discover them.",
  },
] as const;
type Category = (typeof options)[number]["category"];
type Preference = { category: string; enabled: boolean };

export function NotificationSettings({ actor }: { actor: string }) {
  const [values, setValues] = useState<Partial<Record<Category, boolean>>>({});
  const [phase, setPhase] = useState<
    "loading" | "ready" | "saving" | "error" | "denied" | "uncertain"
  >("loading");
  const [message, setMessage] = useState("");
  const epoch = useRef(0);
  const pending = useRef(new Set<string>());
  const saving = useRef(false);
  const uncertainWrite = useRef(false);
  const uncertainIntent = useRef<{
    category: Category;
    enabled: boolean;
  } | null>(null);
  const disposed = useRef(false);
  const load = useCallback(async () => {
    if (
      disposed.current ||
      document.hidden ||
      pending.current.size ||
      saving.current
    )
      return;
    uncertainWrite.current = false;
    const started = ++epoch.current;
    setValues({});
    setMessage("");
    setPhase("loading");
    try {
      const response = await fetch("/api/notifications?preferences=1", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { "x-pals-notification-actor": actor },
      });
      if (
        disposed.current ||
        started !== epoch.current ||
        document.hidden ||
        pending.current.size
      )
        return;
      if (response.status === 403) {
        setPhase("denied");
        return;
      }
      const body = await response.json();
      if (
        disposed.current ||
        started !== epoch.current ||
        document.hidden ||
        pending.current.size
      )
        return;
      if (
        !response.ok ||
        body.kind !== "ok" ||
        body.actor !== actor ||
        !Array.isArray(body.preferences)
      )
        throw new Error("read");
      const next: Partial<Record<Category, boolean>> = {};
      for (const option of options) {
        const row = (body.preferences as Preference[]).find(
          (item) => item.category === option.category,
        );
        if (typeof row?.enabled !== "boolean")
          throw new Error("missing preference");
        next[option.category] = row.enabled;
      }
      setValues(next);
      setPhase("ready");
    } catch {
      if (
        !disposed.current &&
        started === epoch.current &&
        !document.hidden &&
        !pending.current.size
      ) {
        setPhase("error");
        setMessage("Could not load notification settings. Try again.");
      }
    }
  }, [actor]);
  useEffect(() => {
    disposed.current = false;
    const mask = () => {
      epoch.current++;
      setValues({});
      setPhase("loading");
      setMessage("");
    };
    const wake = () => {
      if (document.hidden) mask();
      else if (!pending.current.size && !saving.current) {
        if (uncertainWrite.current) {
          setPhase("uncertain");
          setMessage(
            "The change could not be confirmed. Retry the same choice to confirm it.",
          );
        } else void load();
      }
    };
    const transition = (message: AuthTransitionMessage) => {
      if (message.phase === "begin") {
        pending.current.add(message.token);
        mask();
        return;
      }
      if (message.phase === "settled" || message.phase === "cancelled")
        pending.current.delete(message.token);
      if (!pending.current.size) wake();
    };
    const local = (event: Event) =>
      transition((event as CustomEvent<AuthTransitionMessage>).detail);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
      transition(event.data);
    void load();
    window.addEventListener(AUTH_TRANSITION_EVENT, local);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("pagehide", mask);
    document.addEventListener("visibilitychange", wake);
    return () => {
      disposed.current = true;
      mask();
      channel.close();
      window.removeEventListener(AUTH_TRANSITION_EVENT, local);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("pagehide", mask);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [load]);
  async function save(category: Category, enabled: boolean) {
    if (
      (phase !== "ready" && phase !== "uncertain") ||
      disposed.current ||
      saving.current ||
      pending.current.size ||
      document.hidden
    )
      return;
    saving.current = true;
    uncertainIntent.current = { category, enabled };
    const started = ++epoch.current;
    setPhase("saving");
    setMessage("");
    let confirmed = false;
    let denied = false;
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-pals-notification-actor": actor,
        },
        body: JSON.stringify({ action: "preference", category, enabled }),
      });
      if (response.status === 403) {
        denied = true;
        uncertainIntent.current = null;
        uncertainWrite.current = false;
        return;
      }
      const body = await response.json();
      if (!response.ok || body.kind !== "ok") throw new Error("write");
      confirmed = true;
      uncertainIntent.current = null;
      uncertainWrite.current = false;
    } catch {
      uncertainWrite.current = true;
    } finally {
      saving.current = false;
      if (disposed.current || document.hidden || pending.current.size) return;
      if (denied) {
        if (started === epoch.current) {
          setValues({});
          setPhase("denied");
        } else void load();
      } else if (confirmed) {
        void load();
      } else {
        setValues({});
        setPhase("uncertain");
        setMessage(
          "The change could not be confirmed. Retry the same choice to confirm it.",
        );
      }
    }
  }
  return (
    <section
      className="account-section notification-settings"
      aria-labelledby="activity-title"
    >
      <h2 id="activity-title">Hangout activity</h2>
      <p>
        These optional in-app notifications are off until you turn them on. You
        will only see Hangouts you can currently discover. This does not enable
        push or email.
      </p>
      {(phase === "loading" || phase === "saving") && (
        <p role="status">
          {phase === "saving"
            ? "Saving your choice…"
            : "Checking your settings…"}
        </p>
      )}
      {(phase === "error" || phase === "denied" || phase === "uncertain") && (
        <div role="alert">
          <p>
            {phase === "denied"
              ? "Settings are unavailable for this account."
              : message}
          </p>
          {phase === "error" && (
            <button className="quiet-button" onClick={() => void load()}>
              Reload settings
            </button>
          )}
          {phase === "uncertain" && uncertainIntent.current && (
            <button
              className="quiet-button"
              onClick={() => {
                const intent = uncertainIntent.current;
                if (intent) void save(intent.category, intent.enabled);
              }}
            >
              Retry saving
            </button>
          )}
        </div>
      )}
      {phase === "ready" && (
        <div className="notification-options">
          {options.map((option) => (
            <label className="notification-option" key={option.category}>
              <span>
                <strong>{option.name}</strong>
                <small>{option.description}</small>
              </span>
              <input
                type="checkbox"
                checked={values[option.category] === true}
                onChange={(event) =>
                  void save(option.category, event.target.checked)
                }
              />
            </label>
          ))}
        </div>
      )}
      <p className="notification-essential">
        Changes affect future optional inbox items. Existing items stay in your
        inbox.
      </p>
    </section>
  );
}

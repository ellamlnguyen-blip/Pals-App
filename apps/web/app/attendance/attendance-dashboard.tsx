"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../auth-transition";

type Row = {
  hangout_id: string;
  attended: boolean | null;
  revision: number | null;
  answered_at: string | null;
  within_window: boolean;
  currently_actionable: boolean;
};
type Phase = "checking" | "ready" | "error" | "unavailable";
const PAGE_SIZE = 24;

export function AttendanceDashboard({ actor }: { actor: string }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([]);
  const [choices, setChoices] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [uncertain, setUncertain] = useState<{
    id: string;
    attended: boolean;
  } | null>(null);
  const generation = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const mounted = useRef(false);
  const pendingAuth = useRef(new Set<string>());
  const busyRef = useRef(false);

  const mask = useCallback(() => {
    generation.current++;
    for (const c of controllers.current) c.abort();
    controllers.current.clear();
    setRows([]);
    setCursor(null);
    setHistory([]);
    setChoices({});
    setEditing(null);
    setBusy(null);
    setNotice("");
    setUncertain(null);
    setPhase("checking");
    busyRef.current = false;
  }, []);
  const valid = useCallback(
    (ticket: number) =>
      mounted.current &&
      ticket === generation.current &&
      !document.hidden &&
      !pendingAuth.current.size,
    [],
  );
  const request = useCallback(
    async (input: object) => {
      const controller = new AbortController();
      controllers.current.add(controller);
      try {
        return await fetch("/api/attendance", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-pals-attendance-actor": actor,
          },
          body: JSON.stringify(input),
        });
      } finally {
        controllers.current.delete(controller);
      }
    },
    [actor],
  );
  const load = useCallback(
    async (
      nextCursor: string | null = null,
      nextHistory: (string | null)[] = [],
    ) => {
      if (document.hidden || pendingAuth.current.size) return;
      mask();
      setCursor(nextCursor);
      setHistory(nextHistory);
      const ticket = generation.current;
      try {
        const response = await request({ action: "list", id: nextCursor });
        if (!valid(ticket)) return;
        const data = await response.json();
        if (!valid(ticket)) return;
        if (response.status === 403) {
          mask();
          setPhase("unavailable");
          return;
        }
        if (
          !response.ok ||
          data.kind !== "ok" ||
          data.actor !== actor ||
          !Array.isArray(data.rows)
        ) {
          setPhase("error");
          return;
        }
        if (data.rows.length === 0) {
          setCursor(null);
          setHistory([]);
        }
        setRows(data.rows);
        setPhase("ready");
      } catch {
        if (valid(ticket)) setPhase("error");
      }
    },
    [actor, mask, request, valid],
  );
  useEffect(() => {
    mounted.current = true;
    const auth = (message: AuthTransitionMessage) => {
      if (message.phase === "begin") {
        pendingAuth.current.add(message.token);
        mask();
      } else if (message.phase === "settled" || message.phase === "cancelled") {
        if (pendingAuth.current.delete(message.token)) {
          mask();
          if (!pendingAuth.current.size) void load();
        }
      } else {
        mask();
        if (!pendingAuth.current.size) void load();
      }
    };
    const local = (e: Event) =>
      auth((e as CustomEvent<AuthTransitionMessage>).detail);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = (e) => auth(e.data);
    const wake = () => {
      mask();
      if (!document.hidden && !pendingAuth.current.size) void load();
    };
    const storage = (e: StorageEvent) => {
      if (e.key?.includes("auth-token")) wake();
    };
    queueMicrotask(() => {
      if (mounted.current) void load();
    });
    window.addEventListener(AUTH_TRANSITION_EVENT, local);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("pagehide", mask);
    window.addEventListener("storage", storage);
    return () => {
      mounted.current = false;
      mask();
      channel.close();
      window.removeEventListener(AUTH_TRANSITION_EVENT, local);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("pagehide", mask);
      window.removeEventListener("storage", storage);
    };
  }, [load, mask]);

  const resolve = async (id: string, intended: boolean, ticket: number) => {
    try {
      const response = await request({ action: "exact", id });
      if (!valid(ticket)) return;
      const data = await response.json();
      if (!valid(ticket)) return;
      if (
        response.status === 403 ||
        (response.ok && data.kind === "ok" && data.row === null)
      ) {
        mask();
        setPhase("unavailable");
        return;
      }
      if (
        !response.ok ||
        data.kind !== "ok" ||
        data.actor !== actor ||
        data.row?.hangout_id !== id
      ) {
        setUncertain({ id, attended: intended });
        setNotice(
          "We could not confirm your answer. Check it again before choosing an action.",
        );
        return;
      }
      const observed = data.row as Pick<
        Row,
        "attended" | "revision" | "answered_at"
      >;
      // The exact owner read establishes the write outcome. A fresh owner page
      // separately establishes whether any answer controls may still be shown.
      const pageResponse = await request({ action: "list", id: cursor });
      if (!valid(ticket)) return;
      const page = await pageResponse.json();
      if (!valid(ticket)) return;
      if (pageResponse.status === 403) {
        mask();
        setPhase("unavailable");
        return;
      }
      if (
        !pageResponse.ok ||
        page.kind !== "ok" ||
        page.actor !== actor ||
        !Array.isArray(page.rows)
      ) {
        setUncertain({ id, attended: intended });
        setNotice(
          "We could not recheck whether answering is available. Check again before choosing an action.",
        );
        return;
      }
      const fresh = page.rows as Row[];
      setChoices({});
      setEditing(null);
      setUncertain(null);
      if (!fresh.length) {
        setCursor(null);
        setHistory([]);
        setRows([]);
        setNotice("");
        return;
      }
      const current = fresh.find((item) => item.hangout_id === id);
      if (!current) {
        mask();
        setPhase("unavailable");
        return;
      }
      setRows(fresh);
      setNotice(
        !current.currently_actionable
          ? "Your current answer is shown. Answering is unavailable for this Hangout."
          : observed.attended === intended &&
              current.attended === intended &&
              current.revision === observed.revision
            ? "Your answer was saved."
            : "The saved answer differs from your choice or changed while checking. Choose again if you want to update it.",
      );
    } catch {
      if (valid(ticket)) {
        setUncertain({ id, attended: intended });
        setNotice(
          "We could not confirm your answer. Check it again before choosing an action.",
        );
      }
    }
  };
  const save = async (row: Row) => {
    const selected = choices[row.hangout_id];
    if (busyRef.current || selected === undefined || uncertain) return;
    busyRef.current = true;
    setBusy(row.hangout_id);
    setNotice("");
    const ticket = generation.current;
    try {
      await request({
        action: "answer",
        id: row.hangout_id,
        attended: selected,
        revision: row.revision ?? 0,
      });
    } catch {
      /* A lost response is resolved through an exact own-read. */
    }
    if (valid(ticket)) await resolve(row.hangout_id, selected, ticket);
    if (valid(ticket)) {
      busyRef.current = false;
      setBusy(null);
    }
  };
  const checkUncertain = async () => {
    if (!uncertain || busyRef.current) return;
    busyRef.current = true;
    setBusy(uncertain.id);
    const ticket = generation.current;
    await resolve(uncertain.id, uncertain.attended, ticket);
    if (valid(ticket)) {
      busyRef.current = false;
      setBusy(null);
    }
  };

  return (
    <section className="attendance-page" aria-labelledby="attendance-title">
      <div className="attendance-intro">
        <p className="badge">Private · local only</p>
        <h1 id="attendance-title">Your attendance</h1>
        <p>
          Tell us whether you attended a Hangout. Your answer is self-reported;
          joining a plan does not confirm attendance.
        </p>
        <p>You can change your answer for 30 days after attendance opens.</p>
      </div>
      {phase === "checking" && (
        <p role="status" className="attendance-state">
          Checking your attendance…
        </p>
      )}
      {phase === "unavailable" && (
        <div role="alert" className="attendance-state">
          <h2>Attendance unavailable</h2>
          <p>
            We couldn’t show your records. Check your account and try again.
          </p>
          <button className="quiet-button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {phase === "error" && (
        <div role="alert" className="attendance-state">
          <h2>Couldn’t load attendance</h2>
          <p>Please try again.</p>
          <button
            className="quiet-button"
            onClick={() => void load(cursor, history)}
          >
            Retry
          </button>
        </div>
      )}
      {phase === "ready" && (
        <>
          {!rows.length && (
            <div className="attendance-state">
              <h2>No records available</h2>
              <p>No attendance records are available right now.</p>
              <button className="quiet-button" onClick={() => void load()}>
                Retry
              </button>
            </div>
          )}
          <div className="attendance-list">
            {rows.map((row) => {
              const open = row.currently_actionable;
              const choosing =
                open && (row.attended === null || editing === row.hangout_id);
              return (
                <article className="attendance-row" key={row.hangout_id}>
                  <div className="attendance-reference">
                    <span className="attendance-label">Hangout ID</span>
                    <code>{row.hangout_id}</code>
                  </div>
                  {row.attended !== null && (
                    <p>
                      <strong>Your answer:</strong>{" "}
                      {row.attended ? "I attended" : "I did not attend"}
                    </p>
                  )}
                  {open ? (
                    choosing ? (
                      <fieldset disabled={busy !== null || uncertain !== null}>
                        <legend>Did you attend this Hangout?</legend>
                        <label>
                          <input
                            type="radio"
                            name={`answer-${row.hangout_id}`}
                            checked={choices[row.hangout_id] === true}
                            onChange={() =>
                              setChoices((c) => ({
                                ...c,
                                [row.hangout_id]: true,
                              }))
                            }
                          />{" "}
                          I attended
                        </label>
                        <label>
                          <input
                            type="radio"
                            name={`answer-${row.hangout_id}`}
                            checked={choices[row.hangout_id] === false}
                            onChange={() =>
                              setChoices((c) => ({
                                ...c,
                                [row.hangout_id]: false,
                              }))
                            }
                          />{" "}
                          I did not attend
                        </label>
                        <button
                          className="button"
                          disabled={
                            choices[row.hangout_id] === undefined ||
                            busy !== null ||
                            uncertain !== null
                          }
                          onClick={() => void save(row)}
                        >
                          Save answer
                        </button>
                        {row.attended !== null && (
                          <button
                            className="text-button"
                            onClick={() => {
                              setEditing(null);
                              setChoices({});
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </fieldset>
                    ) : (
                      <button
                        className="quiet-button"
                        disabled={busy !== null || uncertain !== null}
                        onClick={() => {
                          setEditing(row.hangout_id);
                          setChoices({});
                        }}
                      >
                        Change answer
                      </button>
                    )
                  ) : (
                    <p className="attendance-muted">
                      {row.within_window
                        ? "Answering is unavailable for this Hangout."
                        : row.attended === null
                          ? "No answer was saved. Answering has closed."
                          : "Corrections are closed."}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          <p className="attendance-notice" role="status" aria-live="polite">
            {notice}
          </p>
          {uncertain && (
            <button
              className="quiet-button"
              disabled={busy !== null}
              onClick={() => void checkUncertain()}
            >
              Check answer
            </button>
          )}
          <p className="attendance-separate">
            <Link href="/safety">Report a concern separately</Link>
          </p>
          <nav className="attendance-pagination" aria-label="Attendance pages">
            <button
              className="quiet-button"
              disabled={!history.length || busy !== null || uncertain !== null}
              onClick={() =>
                void load(history[history.length - 1], history.slice(0, -1))
              }
            >
              Previous page
            </button>
            <button
              className="quiet-button"
              disabled={
                rows.length < PAGE_SIZE || busy !== null || uncertain !== null
              }
              onClick={() =>
                void load(rows[rows.length - 1].hangout_id, [
                  ...history,
                  cursor,
                ])
              }
            >
              Next page
            </button>
          </nav>
        </>
      )}
    </section>
  );
}

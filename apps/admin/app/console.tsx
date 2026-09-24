"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deniedView,
  duplicateCandidates,
  mutationBody,
  nextCursor,
  responseBelongsTo,
  scheduleSelectedFocus,
  type MutationIntent,
} from "../lib/flow";

type QueueItem = {
  report_id: string;
  submitted_at: string;
  target_type: string;
  target_id: string;
  reporter_id: string;
  category: string;
  case_state: string;
};
type Detail = QueueItem & {
  case_revision: number;
  narrative: string;
  provenance_kind: string | null;
  provenance_ref_id: string | null;
  case_note: string | null;
  disposition: string | null;
  target_status: string;
  target_campus_id: string | null;
  target_disabled: boolean | null;
};
type Cursor = { afterAt: string | null; afterId: string | null };
type Intent = MutationIntent;
const initialCursor: Cursor = { afterAt: null, afterId: null };
const label: Record<string, string> = {
  start_review: "Start review",
  annotate: "Save note",
  close_no_action: "Close with no action",
  close_duplicate: "Close as duplicate",
  reopen: "Reopen review",
  suspend: "Suspend account",
  ban: "Ban account",
  reinstate: "Reinstate account",
  disable: "Disable Hangout",
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function call(path: string, payload?: object) {
  const response = await fetch(path, {
    method: payload ? "POST" : "GET",
    body: payload ? JSON.stringify(payload) : undefined,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok)
    throw new Error(response.status === 403 ? "Denied" : "Unavailable");
  return response.json();
}

export default function Console({ configured }: { configured: boolean }) {
  const [session, setSession] = useState<"loading" | "out" | "in">(
    configured ? "loading" : "out",
  );
  const [role, setRole] = useState<"admin" | "moderator" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState<Cursor>(initialCursor);
  const [history, setHistory] = useState<Cursor[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [uncertain, setUncertain] = useState<Intent | null>(null);
  const [action, setAction] = useState("");
  const [note, setNote] = useState("");
  const [duplicateId, setDuplicateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const generation = useRef(0);
  const sessionGeneration = useRef(0);
  const mutationGeneration = useRef(0);
  const selection = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const clearSensitive = useCallback(() => {
    generation.current++;
    selection.current = null;
    setSelected(null);
    setDetail(null);
    setIntent(null);
    setAction("");
    setNote("");
    setDuplicateId("");
    setMobileDetail(false);
    dialog.current?.close();
  }, []);
  const authorityDenied = useCallback(() => {
    const view = deniedView();
    clearSensitive();
    setQueue(view.queue);
    setHistory(view.history);
    setUncertain(view.uncertain);
    setRole(null);
    setDenied(view.denied);
    setLoading(false);
    setDetailLoading(false);
    setMessage("Moderation unavailable.");
  }, [clearSensitive]);
  const loadQueue = useCallback(
    async (c: Cursor, preserveMessage = false) => {
      const g = ++generation.current;
      setLoading(true);
      setDenied(false);
      try {
        const result = await call("/api/moderation", { op: "list", ...c });
        if (g !== generation.current) return false;
        setQueue(result.data as QueueItem[]);
        setCursor(c);
        setLoading(false);
        if (!preserveMessage) setMessage("");
        return true;
      } catch {
        if (g !== generation.current) return false;
        authorityDenied();
        return false;
      }
    },
    [authorityDenied],
  );
  useEffect(() => {
    if (!configured) return;
    let active = true;
    call("/api/session")
      .then((r) => {
        if (active) {
          setRole(r.role ?? null);
          setSession(r.signedIn ? "in" : "out");
        }
      })
      .catch(() => {
        if (active) setSession("out");
      });
    return () => {
      active = false;
    };
  }, [configured]);
  useEffect(() => {
    if (session !== "in") return;
    let active = true;
    queueMicrotask(() => {
      if (active) void loadQueue(initialCursor);
    });
    return () => {
      active = false;
    };
  }, [session, loadQueue]);

  async function openDetail(id: string, preserveMessage = false) {
    lastFocus.current = document.activeElement as HTMLElement;
    selection.current = id;
    const g = ++generation.current;
    const capturedSession = sessionGeneration.current;
    setSelected(id);
    setDetail(null);
    setDetailLoading(true);
    setIntent(null);
    setMobileDetail(true);
    if (!preserveMessage) setMessage("");
    try {
      const result = await call("/api/moderation", {
        op: "detail",
        reportId: id,
      });
      if (
        !responseBelongsTo(
          { generation: g, session: capturedSession, reportId: id },
          {
            generation: generation.current,
            session: sessionGeneration.current,
            reportId: selection.current,
          },
        )
      )
        return;
      const row = result.data?.[0] as Detail | undefined;
      if (!row || row.report_id !== id) throw new Error("Unavailable");
      setDetail(row);
      setDetailLoading(false);
      scheduleSelectedFocus(
        id,
        () => selection.current,
        () => document.getElementById("detail-heading")?.focus(),
        requestAnimationFrame,
      );
    } catch {
      if (g !== generation.current) return;
      authorityDenied();
    }
  }
  function back() {
    clearSensitive();
    requestAnimationFrame(() => lastFocus.current?.focus());
  }
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await call("/api/session", { op: "in", email, password });
      const current = await call("/api/session");
      setRole(current.role ?? null);
      setPassword("");
      setSession("in");
    } catch {
      setMessage(
        "Sign-in unavailable. Check your credentials and local setup.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    sessionGeneration.current++;
    mutationGeneration.current++;
    generation.current++;
    clearSensitive();
    setQueue([]);
    setHistory([]);
    setUncertain(null);
    setRole(null);
    setSession("out");
    try {
      await call("/api/session", { op: "out" });
    } catch {
      setMessage("Sign-out could not be confirmed. Close this tab.");
    }
  }
  function prepare(kind: string) {
    if (!detail || busy) return;
    setAction(kind);
    setNote("");
    setDuplicateId("");
    const p: Intent = {
      op: ["suspend", "ban", "reinstate"].includes(kind)
        ? "account"
        : kind === "disable"
          ? "hangout"
          : "case",
      reportId: detail.report_id,
      requestId: crypto.randomUUID(),
      revision: detail.case_revision,
      action: kind,
    };
    setIntent(p);
    dialog.current?.showModal();
  }
  function finishIntent() {
    dialog.current?.close();
    setIntent(null);
    setAction("");
    setNote("");
    setDuplicateId("");
  }
  function confirmation(): Intent | null {
    if (
      !intent ||
      !detail ||
      intent.reportId !== detail.report_id ||
      intent.revision !== detail.case_revision
    )
      return null;
    if (intent.op === "case") {
      if (
        action !== "start_review" &&
        (!note.trim() || [...note.trim()].length > 2000)
      )
        return null;
      if (action === "close_duplicate" && !uuid.test(duplicateId.trim()))
        return null;
      return {
        ...intent,
        note: action === "start_review" ? null : note.trim(),
        duplicateId: action === "close_duplicate" ? duplicateId.trim() : null,
      };
    }
    if (!note.trim() || [...note.trim()].length > 2000) return null;
    return {
      ...intent,
      reason: note.trim(),
      ...(intent.op === "hangout" ? { action: undefined } : {}),
    };
  }
  async function submit(p: Intent) {
    const mutation = ++mutationGeneration.current;
    setBusy(true);
    setUncertain(p);
    finishIntent();
    const captured = generation.current;
    const capturedSession = sessionGeneration.current;
    const isCurrent = () =>
      responseBelongsTo(
        {
          generation: captured,
          session: capturedSession,
          reportId: p.reportId,
        },
        {
          generation: generation.current,
          session: sessionGeneration.current,
          reportId: selection.current,
        },
      );
    try {
      await call("/api/moderation", mutationBody(p));
      if (isCurrent()) {
        setUncertain(null);
        setMessage("Decision recorded. Refreshing the audited state.");
        const refreshed = await loadQueue(cursor, true);
        if (
          refreshed &&
          capturedSession === sessionGeneration.current &&
          selection.current === p.reportId
        )
          await openDetail(p.reportId, true);
      }
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof Error && error.message === "Denied") {
        authorityDenied();
      } else {
        setMessage(
          "Outcome unconfirmed. Retry the same request or refresh the report before deciding again.",
        );
      }
    } finally {
      if (
        mutation === mutationGeneration.current &&
        capturedSession === sessionGeneration.current
      )
        setBusy(false);
    }
  }
  const actions =
    detail?.case_state === "open"
      ? ["start_review"]
      : detail?.case_state === "closed"
        ? ["reopen"]
        : detail?.case_state === "in_review"
          ? [
              "annotate",
              "close_no_action",
              "close_duplicate",
              ...(detail.target_type === "user" &&
              detail.target_status === "active"
                ? ["suspend", ...(role === "admin" ? ["ban"] : [])]
                : []),
              ...(detail.target_type === "user" &&
              role === "admin" &&
              ["suspended", "banned"].includes(detail.target_status)
                ? [
                    "reinstate",
                    ...(detail.target_status === "suspended" ? ["ban"] : []),
                  ]
                : []),
              ...(detail.target_type === "hangout" &&
              detail.target_status !== "unavailable" &&
              detail.target_disabled === false
                ? ["disable"]
                : []),
            ]
          : [];
  const current = queue.find((q) => q.report_id === selected);
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="masthead">
        <span className="wordmark">
          pals<span className="wordmark-sub"> / moderation</span>
        </span>
        <span className="campus">UNC Chapel Hill · local workspace</span>
        {session === "in" && (
          <button className="text-button" onClick={signOut}>
            Sign out
          </button>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        {!configured ? (
          <section className="setup">
            <p className="eyebrow">Local setup</p>
            <h1>Connect the local workspace</h1>
            <p>
              Configure a local Supabase publishable key to use moderation. No
              operator access is available in this state.
            </p>
          </section>
        ) : session === "loading" ? (
          <section className="setup" role="status">
            <h1>Checking your session</h1>
          </section>
        ) : session === "out" ? (
          <section className="setup sign-in">
            <p className="eyebrow">Private workspace</p>
            <h1>Sign in to review reports</h1>
            <p>
              Authorized campus operators only. Earlier unconfirmed actions may
              have completed; open a fresh report before acting.
            </p>
            <form onSubmit={signIn}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button disabled={busy}>Sign in</button>
            </form>
          </section>
        ) : (
          <>
            <div className="heading">
              <p className="eyebrow">Safety operations</p>
              <h1>Reports</h1>
              <p>
                Review each allegation against the current case and target
                state.
              </p>
            </div>
            {denied ? (
              <section className="state" role="alert">
                <h2>Moderation unavailable</h2>
                <p>This workspace cannot load reports right now.</p>
                <button onClick={() => void loadQueue(initialCursor)}>
                  Try again
                </button>
              </section>
            ) : (
              <div className={`workspace ${mobileDetail ? "show-detail" : ""}`}>
                <section
                  className="queue-panel"
                  aria-labelledby="queue-heading"
                >
                  <div className="panel-heading">
                    <h2 id="queue-heading">Review queue</h2>
                    <span>Newest first · up to 24</span>
                  </div>
                  {loading ? (
                    <p role="status" className="state-inline">
                      Loading reports…
                    </p>
                  ) : queue.length === 0 ? (
                    <p className="state-inline">
                      No reviewable reports on this page.
                    </p>
                  ) : (
                    <ol className="report-list">
                      {queue.map((q) => (
                        <li key={q.report_id}>
                          <button
                            className={`report-row ${selected === q.report_id ? "selected" : ""}`}
                            onClick={() => void openDetail(q.report_id)}
                            aria-current={
                              selected === q.report_id ? "true" : undefined
                            }
                          >
                            <span className="row-top">
                              <strong>{q.category}</strong>
                              <time>
                                {new Date(q.submitted_at).toLocaleString()}
                              </time>
                            </span>
                            <span className="row-meta">
                              {q.target_type === "hangout"
                                ? "Hangout"
                                : "Account"}{" "}
                              · {q.case_state}
                            </span>
                            <span className="row-id">Report {q.report_id}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="pagination">
                    <button
                      className="secondary"
                      disabled={loading || history.length === 0}
                      onClick={() => {
                        const h = history.slice(0, -1);
                        setHistory(h);
                        clearSensitive();
                        void loadQueue(history.at(-1) ?? initialCursor);
                      }}
                    >
                      Back
                    </button>
                    <button
                      className="secondary"
                      disabled={loading || !nextCursor(queue)}
                      onClick={() => {
                        const next = nextCursor(queue);
                        if (!next) return;
                        setHistory([...history, cursor]);
                        clearSensitive();
                        void loadQueue(next);
                      }}
                    >
                      Next page
                    </button>
                  </div>
                </section>
                <section
                  className="detail-panel"
                  aria-labelledby="detail-heading"
                >
                  {selected && (
                    <button className="back-detail secondary" onClick={back}>
                      Back to reports
                    </button>
                  )}
                  {!selected ? (
                    <div className="detail-empty">
                      <h2 id="detail-heading">Select a report</h2>
                      <p>Opening a report records an audited detail read.</p>
                    </div>
                  ) : detailLoading ? (
                    <p role="status" className="state-inline">
                      Loading report detail…
                    </p>
                  ) : detail ? (
                    <>
                      <div className="panel-heading detail-title">
                        <div>
                          <p className="eyebrow">Unverified report</p>
                          <h2 id="detail-heading" tabIndex={-1}>
                            {detail.category}
                          </h2>
                        </div>
                        <span className="state-tag">
                          {detail.case_state.replaceAll("_", " ")}
                        </span>
                      </div>
                      <dl className="facts">
                        <div>
                          <dt>Report</dt>
                          <dd>{detail.report_id}</dd>
                        </div>
                        <div>
                          <dt>Submitted</dt>
                          <dd>
                            {new Date(detail.submitted_at).toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt>Reporter</dt>
                          <dd>{detail.reporter_id}</dd>
                        </div>
                        <div>
                          <dt>Target</dt>
                          <dd>
                            {detail.target_type} · {detail.target_id}
                          </dd>
                        </div>
                      </dl>
                      <div className="evidence">
                        <h3>Allegation · unverified</h3>
                        <p>{detail.narrative}</p>
                      </div>
                      <dl className="facts">
                        <div>
                          <dt>Evidence reference</dt>
                          <dd>
                            {detail.provenance_kind ?? "None"}
                            {detail.provenance_ref_id
                              ? ` · ${detail.provenance_ref_id}`
                              : ""}
                          </dd>
                        </div>
                        <div>
                          <dt>Case revision</dt>
                          <dd>{detail.case_revision}</dd>
                        </div>
                        <div>
                          <dt>Case note</dt>
                          <dd>{detail.case_note ?? "None"}</dd>
                        </div>
                        <div>
                          <dt>Disposition</dt>
                          <dd>{detail.disposition ?? "None"}</dd>
                        </div>
                      </dl>
                      <div className="target">
                        <h3>Current target state</h3>
                        <dl className="facts">
                          <div>
                            <dt>Status</dt>
                            <dd>{detail.target_status}</dd>
                          </div>
                          <div>
                            <dt>Campus ID</dt>
                            <dd>{detail.target_campus_id ?? "Unavailable"}</dd>
                          </div>
                          {detail.target_type === "hangout" && (
                            <div>
                              <dt>Disabled</dt>
                              <dd>
                                {detail.target_disabled === null
                                  ? "Unavailable"
                                  : detail.target_disabled
                                    ? "Yes"
                                    : "No"}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      {uncertain?.reportId === detail.report_id && (
                        <div className="retry" role="status">
                          <strong>Outcome unconfirmed</strong>
                          <p>
                            This exact request may already have succeeded. Retry
                            with the same request ID and details.
                          </p>
                          <button
                            disabled={busy}
                            onClick={() => void submit(uncertain)}
                          >
                            Retry same request
                          </button>
                        </div>
                      )}
                      <div className="actions">
                        <h3>Review actions</h3>
                        <p>
                          Each decision requires confirmation and is checked
                          again by the database.
                        </p>
                        <div className="action-buttons">
                          {actions.map((a) => (
                            <button
                              className={
                                a === "ban" || a === "disable"
                                  ? "danger"
                                  : "secondary"
                              }
                              key={a}
                              disabled={busy || !!uncertain}
                              onClick={() => prepare(a)}
                            >
                              {label[a]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="detail-empty">
                      <h2 id="detail-heading">Report unavailable</h2>
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}
      </main>
      <dialog
        ref={dialog}
        onClose={() => {
          setIntent(null);
          setAction("");
          setNote("");
          setDuplicateId("");
        }}
        aria-labelledby="confirm-title"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const p = confirmation();
            if (p) void submit(p);
          }}
        >
          <p className="eyebrow">Confirm decision</p>
          <h2 id="confirm-title">{label[action]}</h2>
          <p className="confirm-copy">
            {action === "suspend"
              ? "Suspend this student’s access."
              : action === "ban"
                ? "Ban this student’s access."
                : action === "reinstate"
                  ? "Restore this student’s access."
                  : action === "disable"
                    ? "Disable this Hangout and close its case."
                    : action === "close_duplicate"
                      ? "Close this case as linked to another report. No sanction is applied."
                      : "Record this review decision. No sanction is applied."}
          </p>
          <p className="confirm-target">
            Report {intent?.reportId}
            <br />
            Revision {intent?.revision}
            {current && (
              <>
                <br />
                Submitted {new Date(current.submitted_at).toLocaleString()}
              </>
            )}
          </p>
          {action !== "start_review" && (
            <label>
              {intent?.op === "case" ? "Case note" : "Reason"}
              <textarea
                required
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </label>
          )}
          {action === "close_duplicate" && (
            <>
              <p>
                The candidate must be a distinct earlier reviewable report for
                this exact target, ordered by submission time and ID.
              </p>
              <label>
                Earlier report ID
                <input
                  required
                  pattern="[0-9a-fA-F-]{36}"
                  value={duplicateId}
                  onChange={(e) => setDuplicateId(e.target.value)}
                />
              </label>
              <div className="candidates">
                {(detail ? duplicateCandidates(queue, detail) : []).map((q) => (
                  <button
                    type="button"
                    className="secondary"
                    key={q.report_id}
                    onClick={() => setDuplicateId(q.report_id)}
                  >
                    Use {q.report_id}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="dialog-buttons">
            <button type="button" className="secondary" onClick={finishIntent}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !confirmation()}>
              {label[action] ?? "Confirm"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

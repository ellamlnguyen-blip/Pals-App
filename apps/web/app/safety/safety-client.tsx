"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../auth-transition";
import { globalConfirmationVersion } from "../../lib/safety-public";
import "./safety.css";

type Phase = "checking" | "ready" | "unavailable" | "error";
type BlockRow = { account_id: string };
type RetainedRow = { hangout_id: string; own_state: string };
type ReportMode = "user" | "hangout" | "hangout_host";
type ReportTarget = { mode: ReportMode; id: string };
type Retry = {
  requestId: string;
  mode: ReportMode;
  id: string;
  category: string;
  narrative: string;
};
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const mutationChannel = "pals-safety-mutation";
const mutationEvent = "pals-safety-mutation-local";
const categories = [
  "harassment",
  "safety concern",
  "impersonation",
  "spam/commercial promotion",
  "other",
];
function signal(actor: string, sender: string) {
  const value = { actor, sender, token: crypto.randomUUID() };
  const channel = new BroadcastChannel(mutationChannel);
  channel.postMessage(value);
  channel.close();
}
function request(actor: string, path: string, init?: RequestInit) {
  return fetch(`/api/safety${path}`, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: { "x-pals-safety-actor": actor, ...(init?.headers ?? {}) },
  });
}
function useSafety(actor: string) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [sender] = useState(() => crypto.randomUUID());
  const generation = useRef(0);
  const mounted = useRef(false);
  const pending = useRef(new Set<string>());
  const [epoch, setEpoch] = useState(0);
  const mask = useCallback(() => {
    generation.current++;
    setPhase("checking");
    setEpoch((x) => x + 1);
  }, []);
  const deny = useCallback(() => {
    mask();
    setPhase("unavailable");
  }, [mask]);
  const valid = useCallback(
    (ticket: number) =>
      mounted.current &&
      ticket === generation.current &&
      !document.hidden &&
      pending.current.size === 0,
    [],
  );
  const check = useCallback(async () => {
    if (document.hidden || pending.current.size) return;
    mask();
    const ticket = generation.current;
    try {
      const response = await request(actor, "?view=probe");
      if (!valid(ticket)) return;
      const data = await response.json();
      if (!valid(ticket)) return;
      setPhase(
        response.ok && data.kind === "ok" && data.actor === actor
          ? "ready"
          : response.status === 403
            ? "unavailable"
            : "error",
      );
    } catch {
      if (valid(ticket)) setPhase("error");
    }
  }, [actor, mask, valid]);
  useEffect(() => {
    mounted.current = true;
    const auth = (message: AuthTransitionMessage) => {
      if (message.phase === "begin") {
        pending.current.add(message.token);
        mask();
      } else if (message.phase === "settled" || message.phase === "cancelled") {
        if (pending.current.delete(message.token)) {
          mask();
          if (!pending.current.size) void check();
        }
      } else {
        mask();
        if (!pending.current.size) void check();
      }
    };
    const local = (event: Event) =>
      auth((event as CustomEvent<AuthTransitionMessage>).detail);
    const authChannel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    authChannel.onmessage = (event) => auth(event.data);
    const mutChannel = new BroadcastChannel(mutationChannel);
    const mutation = (value: { actor: string; sender: string }) => {
      if (value.actor === actor && value.sender !== sender) {
        mask();
        void check();
      }
    };
    mutChannel.onmessage = (event) => mutation(event.data);
    const localMutation = (event: Event) =>
      mutation(
        (event as CustomEvent<{ actor: string; sender: string }>).detail,
      );
    const wake = () => {
      mask();
      if (!document.hidden && !pending.current.size) void check();
    };
    const storage = (event: StorageEvent) => {
      if (event.key?.includes("auth-token")) wake();
    };
    queueMicrotask(() => {
      if (mounted.current) void check();
    });
    window.addEventListener(AUTH_TRANSITION_EVENT, local);
    window.addEventListener(mutationEvent, localMutation);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("pagehide", mask);
    window.addEventListener("storage", storage);
    return () => {
      mounted.current = false;
      mask();
      authChannel.close();
      mutChannel.close();
      window.removeEventListener(AUTH_TRANSITION_EVENT, local);
      window.removeEventListener(mutationEvent, localMutation);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("pagehide", mask);
      window.removeEventListener("storage", storage);
    };
  }, [actor, check, mask, sender]);
  return {
    phase,
    epoch,
    generation,
    valid,
    mask,
    deny,
    check,
    sender,
  };
}

export function SafetyActions({
  actor,
  target,
  allowBlock = false,
  label,
  onBlockConfirmed,
}: {
  actor: string;
  target: ReportTarget;
  allowBlock?: boolean;
  label?: string;
  onBlockConfirmed?: () => void;
}) {
  const safety = useSafety(actor);
  const [report, setReport] = useState(false);
  const [block, setBlock] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      setReport(false);
      setBlock(false);
    });
  }, [safety.epoch]);
  if (safety.phase !== "ready") return null;
  return (
    <div className="safety-context">
      {allowBlock && target.mode === "user" && (
        <button className="text-button" onClick={() => setBlock(true)}>
          Block this account
        </button>
      )}
      <button className="text-button" onClick={() => setReport(true)}>
        {label ??
          (target.mode === "user"
            ? "Report this account"
            : target.mode === "hangout_host"
              ? "Report its host"
              : "Report this Hangout")}
      </button>
      {block && target.mode === "user" && (
        <BlockDialog
          actor={actor}
          id={target.id}
          blocked={true}
          onClose={() => setBlock(false)}
          onConfirmed={onBlockConfirmed}
          safety={safety}
        />
      )}
      {report && (
        <ReportForm
          key={`${safety.epoch}:${target.mode}:${target.id}`}
          actor={actor}
          target={target}
          safety={safety}
          onClose={() => setReport(false)}
        />
      )}
    </div>
  );
}

type SafetyState = ReturnType<typeof useSafety>;
function BlockDialog({
  actor,
  id,
  blocked,
  onClose,
  safety,
  onConfirmed,
}: {
  actor: string;
  id: string;
  blocked: boolean;
  onClose: () => void;
  safety: SafetyState;
  onConfirmed?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [observed, setObserved] = useState<boolean | null>(null);
  useEffect(() => {
    if (status && !busy) statusRef.current?.focus();
  }, [status, busy]);
  useEffect(() => {
    origin.current = document.activeElement as HTMLElement;
    const openingTicket = safety.generation.current;
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLElement>("h2")?.focus();
    return () => {
      element?.close();
      if (safety.valid(openingTicket) && origin.current?.isConnected)
        origin.current.focus();
    };
    // Dialog origin is captured once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = () => {
    if (!busy) onClose();
  };
  const exact = async () => {
    const ticket = safety.generation.current;
    try {
      const res = await request(
        actor,
        `?view=exact&id=${encodeURIComponent(id)}`,
      );
      if (!safety.valid(ticket)) return;
      const data = await res.json();
      if (!safety.valid(ticket)) return;
      if (res.status === 403) {
        safety.deny();
        return;
      }
      if (
        !res.ok ||
        data.kind !== "ok" ||
        data.actor !== actor ||
        typeof data.blocked !== "boolean"
      )
        throw Error();
      setObserved(data.blocked);
      setStatus(
        data.blocked
          ? "This exact ID is currently on your outbound block list."
          : "This exact ID is not currently on your outbound block list. An earlier request may still finish.",
      );
    } catch {
      if (safety.valid(ticket))
        setStatus("Could not check blocked IDs. Reload before another action.");
    } finally {
      /* A fresh user-invoked check never resends a mutation. */
    }
  };
  const submit = async () => {
    if (busy || !uuid.test(id) || safety.phase !== "ready") return;
    setBusy(true);
    setStatus("Checking the exact outbound ID…");
    signal(actor, safety.sender);
    const ticket = safety.generation.current;
    try {
      const res = await request(actor, "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block",
          id,
          blocked,
          confirmation: globalConfirmationVersion,
        }),
      });
      if (!safety.valid(ticket)) return;
      const data = await res.json();
      if (!safety.valid(ticket)) return;
      if (res.status === 403) {
        safety.deny();
        return;
      }
      if (!res.ok || data.kind !== "ok") throw Error();
      const check = await request(
        actor,
        `?view=exact&id=${encodeURIComponent(id)}`,
      );
      if (!safety.valid(ticket)) return;
      const state = await check.json();
      if (!safety.valid(ticket)) return;
      if (check.status === 403) {
        safety.deny();
        return;
      }
      if (
        !check.ok ||
        state.kind !== "ok" ||
        state.actor !== actor ||
        typeof state.blocked !== "boolean"
      )
        throw Error();
      setObserved(state.blocked);
      setStatus(
        state.blocked === blocked
          ? blocked
            ? "Block confirmed. Your shared Hangout access may have changed."
            : "Unblock confirmed. Past relationships and attendance are not restored."
          : "The latest exact ID state differs from this request. Check blocked IDs before choosing another action.",
      );
      if (state.blocked === blocked) onConfirmed?.();
    } catch {
      if (safety.valid(ticket))
        setStatus(
          `We could not confirm the ${blocked ? "block" : "unblock"}. Check blocked IDs before choosing another action.`,
        );
    } finally {
      signal(actor, safety.sender);
      if (safety.valid(ticket)) setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else close();
      }}
      onClose={close}
      aria-labelledby="safety-block-title"
      aria-describedby="safety-block-explain"
    >
      <h2 id="safety-block-title" tabIndex={-1}>
        {blocked ? "Block this account?" : "Unblock this account?"}
      </h2>
      <p className="safety-id">{id}</p>
      {blocked ? (
        <div id="safety-block-explain">
          <p>
            Any friendship and direct chat with this person end. You stop
            appearing to one another in People and lose blocked private Hangout
            access.
          </p>
          <p>
            If you host a Hangout you both joined, they are removed. In any
            other Hangout you both joined, you leave. This may affect several
            Hangouts, including cancelled ones.
          </p>
          <p>
            Unblocking later will not restore attendance, friendship or chat.
            Blocking cannot prevent contact outside Pals or guarantee physical
            safety.
          </p>
        </div>
      ) : (
        <p id="safety-block-explain">
          Unblocking may allow future interaction under the usual rules. It will
          not restore a friendship, direct chat or Hangout attendance.
        </p>
      )}
      <p ref={statusRef} tabIndex={-1} role="status">
        {status}
      </p>
      {observed !== null && (
        <p>
          Observed exact outbound state: {observed ? "Blocked" : "Not blocked"}
        </p>
      )}
      <div className="safety-dialog-actions">
        {!status && (
          <button
            className="button"
            disabled={busy}
            onClick={() => void submit()}
          >
            {blocked ? "Block this account" : "Unblock this ID"}
          </button>
        )}
        {status && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void exact()}
          >
            Check blocked IDs
          </button>
        )}
        <button className="text-button" disabled={busy} onClick={close}>
          {status ? "Done" : "Cancel"}
        </button>
      </div>
    </dialog>
  );
}

function ReportForm({
  actor,
  target,
  safety,
  onClose,
}: {
  actor: string;
  target: ReportTarget;
  safety: SafetyState;
  onClose: () => void;
}) {
  const [category, setCategory] = useState("");
  const [narrative, setNarrative] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [unknown, setUnknown] = useState<Retry | null>(null);
  const [receipt, setReceipt] = useState<{
    receipt_id: string;
    submitted_at: string;
  } | null>(null);
  useEffect(() => {
    if (status && !busy) statusRef.current?.focus();
  }, [status, busy]);
  const normalized = narrative.trim();
  const count = [...normalized].length;
  const error =
    category === "other" && count === 0
      ? "Add a short description for Other."
      : count > 2000
        ? "Keep the description to 2000 characters."
        : "";
  const edit = (value: string) => {
    setNarrative(value);
    if (unknown) {
      setUnknown(null);
      setStatus(
        "Editing starts a new report attempt, which may count toward the five-per-hour local limit.",
      );
    }
  };
  const send = async (attempt: Retry) => {
    if (busy || safety.phase !== "ready") return;
    setBusy(true);
    setStatus("Submitting report…");
    const ticket = safety.generation.current;
    try {
      const res = await request(actor, "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report", ...attempt }),
      });
      if (!safety.valid(ticket)) return;
      const data = await res.json();
      if (!safety.valid(ticket)) return;
      if (res.status === 403) {
        safety.deny();
        return;
      }
      if (
        !res.ok ||
        data.kind !== "ok" ||
        data.actor !== actor ||
        !uuid.test(data.receipt?.receipt_id) ||
        !Number.isFinite(Date.parse(data.receipt?.submitted_at))
      )
        throw Error();
      setNarrative("");
      setUnknown(null);
      setReceipt(data.receipt);
      setStatus("Report saved locally. Blocking is a separate choice.");
    } catch {
      if (safety.valid(ticket)) {
        setUnknown(attempt);
        setStatus(
          "We could not confirm whether this report was saved. Retry this same report only if you want to check the same attempt.",
        );
      }
    } finally {
      if (safety.valid(ticket)) setBusy(false);
    }
  };
  return (
    <section className="safety-report-form" aria-label="Report a concern">
      <h3>Report a concern</h3>
      <p>
        Target:{" "}
        {target.mode === "user"
          ? "Account"
          : target.mode === "hangout_host"
            ? "Host of retained Hangout"
            : "Hangout"}{" "}
        <span className="safety-id">{target.id}</span>
      </p>
      {target.mode === "hangout_host" && (
        <p>The host&apos;s details are not shown here.</p>
      )}
      {!receipt && (
        <>
          <label htmlFor={`category-${target.id}`}>Category</label>
          <select
            id={`category-${target.id}`}
            value={category}
            disabled={busy}
            onChange={(event) => {
              setCategory(event.target.value);
              if (unknown) {
                setUnknown(null);
                setStatus(
                  "Changing this report starts a new attempt and may count toward the five-per-hour local limit.",
                );
              }
            }}
          >
            <option value="">Choose a category</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <label htmlFor={`narrative-${target.id}`}>
            What happened? {category === "other" ? "Required" : "Optional"}
          </label>
          <textarea
            id={`narrative-${target.id}`}
            rows={5}
            value={narrative}
            disabled={busy}
            aria-describedby={`count-${target.id} error-${target.id}`}
            onChange={(event) => edit(event.target.value)}
          />
          <p id={`count-${target.id}`}>{count} / 2000 characters</p>
          <p id={`error-${target.id}`} role="alert">
            {category && error}
          </p>
        </>
      )}
      <p ref={statusRef} tabIndex={-1} role={unknown ? "alert" : "status"}>
        {status}
      </p>
      {receipt && (
        <p className="safety-id">
          Receipt {receipt.receipt_id} ·{" "}
          {new Date(receipt.submitted_at).toLocaleString()}
        </p>
      )}
      <div className="safety-dialog-actions">
        {!receipt && !unknown && (
          <button
            className="button"
            disabled={busy || !category || !!error}
            onClick={() =>
              void send({
                requestId: crypto.randomUUID(),
                mode: target.mode,
                id: target.id,
                category,
                narrative: normalized,
              })
            }
          >
            Submit report
          </button>
        )}
        {unknown && (
          <button
            className="button"
            disabled={busy}
            onClick={() => void send(unknown)}
          >
            Retry this same report
          </button>
        )}
        <button className="text-button" disabled={busy} onClick={onClose}>
          Close report form
        </button>
      </div>
    </section>
  );
}

export function SafetyDashboard({ actor }: { actor: string }) {
  const safety = useSafety(actor);
  const [id, setId] = useState("");
  const [blockId, setBlockId] = useState<string | null>(null);
  const [unblockId, setUnblockId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockRow[]>([]);
  const [retained, setRetained] = useState<RetainedRow[]>([]);
  const [blockCursors, setBlockCursors] = useState<(string | null)[]>([null]);
  const [retainedCursors, setRetainedCursors] = useState<(string | null)[]>([
    null,
  ]);
  const [blockPage, setBlockPage] = useState(0);
  const [retainedPage, setRetainedPage] = useState(0);
  const [listStatus, setListStatus] = useState("");
  const [blockedPhase, setBlockedPhase] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [retainedPhase, setRetainedPhase] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [target, setTarget] = useState<ReportTarget | null>(null);
  const load = useCallback(
    async (
      kind: "blocked" | "retained",
      after: string | null,
      page: number,
    ) => {
      const ticket = safety.generation.current;
      if (kind === "blocked") {
        setBlocked([]);
        setBlockedPhase("loading");
      } else {
        setRetained([]);
        setRetainedPhase("loading");
      }
      setListStatus("");
      try {
        const response = await request(
          actor,
          `?view=${kind}${after ? `&after=${after}` : ""}`,
        );
        if (!safety.valid(ticket)) return;
        const data = await response.json();
        if (!safety.valid(ticket)) return;
        if (response.status === 403) {
          safety.deny();
          return;
        }
        if (
          !response.ok ||
          data.kind !== "ok" ||
          data.actor !== actor ||
          !Array.isArray(data.rows) ||
          data.rows.length > 24
        )
          throw Error();
        if (kind === "blocked") {
          if (!data.rows.every((x: BlockRow) => uuid.test(x.account_id)))
            throw Error();
          setBlocked(data.rows);
          setBlockedPhase("ready");
          setBlockPage(page);
          setBlockCursors((x) => [...x.slice(0, page), after]);
        } else {
          if (
            !data.rows.every(
              (x: RetainedRow) =>
                uuid.test(x.hangout_id) &&
                ["host", "joined", "left", "removed"].includes(x.own_state),
            )
          )
            throw Error();
          setRetained(data.rows);
          setRetainedPhase("ready");
          setRetainedPage(page);
          setRetainedCursors((x) => [...x.slice(0, page), after]);
        }
      } catch {
        if (safety.valid(ticket)) {
          setListStatus("Could not load this page. Try again.");
          if (kind === "blocked") setBlockedPhase("error");
          else setRetainedPhase("error");
        }
      }
    },
    [actor, safety],
  );
  useEffect(() => {
    queueMicrotask(() => {
      setId("");
      setBlockId(null);
      setUnblockId(null);
      setBlocked([]);
      setRetained([]);
      setTarget(null);
      setBlockedPhase("loading");
      setRetainedPhase("loading");
      setBlockPage(0);
      setRetainedPage(0);
      setBlockCursors([null]);
      setRetainedCursors([null]);
      setListStatus("");
      if (safety.phase === "ready") {
        void load("blocked", null, 0);
        void load("retained", null, 0);
      }
    });
    // An epoch is the generation boundary; refreshing pages starts at the first page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safety.epoch, safety.phase, actor]);
  return (
    <div className="safety-page">
      <div className="safety-intro">
        <p className="badge">Account safety · local only</p>
        <h1>Safety</h1>
        <p>
          Manage privacy and send a private report. These local tools do not
          provide an emergency response.
        </p>
      </div>
      {safety.phase === "checking" && (
        <p role="status">Checking account access…</p>
      )}
      {safety.phase === "unavailable" && (
        <div role="alert">
          <p>Safety is unavailable for this account right now.</p>
          <button className="text-button" onClick={() => void safety.check()}>
            Reload access
          </button>
        </div>
      )}
      {safety.phase === "error" && (
        <div role="alert">
          <p>Could not check Safety. Try again.</p>
          <button className="text-button" onClick={() => void safety.check()}>
            Retry
          </button>
        </div>
      )}
      {safety.phase === "ready" && (
        <>
          <section aria-labelledby="safety-block-heading">
            <h2 id="safety-block-heading">Block someone</h2>
            <p>
              Enter a full known account ID. No profile details are shown here.
              A current or retained relationship is required.
            </p>
            <label htmlFor="safety-account-id">Account ID</label>
            <div className="safety-input-row">
              <input
                id="safety-account-id"
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                aria-describedby="safety-id-help"
              />
              <button
                className="button"
                disabled={!uuid.test(id)}
                onClick={() => setBlockId(id.toLowerCase())}
              >
                Review block
              </button>
            </div>
            <p id="safety-id-help" className="help">
              Use the full account ID. Entering an ID does not look up a
              profile.
            </p>
          </section>
          <section aria-labelledby="safety-ids-heading">
            <h2 id="safety-ids-heading">Your blocked account IDs</h2>
            <p>
              Only outbound IDs you blocked are shown. Incoming blocks are never
              listed.
            </p>
            {blockedPhase === "loading" ? (
              <p role="status">Loading outbound IDs…</p>
            ) : blockedPhase === "error" ? (
              <button
                className="text-button"
                onClick={() =>
                  void load("blocked", blockCursors[blockPage], blockPage)
                }
              >
                Retry blocked IDs
              </button>
            ) : blocked.length ? (
              <ul className="safety-list">
                {blocked.map((row) => (
                  <li key={row.account_id}>
                    <code className="safety-id">{row.account_id}</code>
                    <button
                      className="text-button"
                      onClick={() => setUnblockId(row.account_id)}
                    >
                      Unblock this ID
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>You have no outbound blocked IDs on this page.</p>
            )}
            <nav aria-label="Blocked ID pages" className="safety-pages">
              <button
                className="text-button"
                disabled={blockPage === 0}
                onClick={() =>
                  void load(
                    "blocked",
                    blockCursors[blockPage - 1],
                    blockPage - 1,
                  )
                }
              >
                First or previous IDs
              </button>
              <span>Page {blockPage + 1}</span>
              <button
                className="text-button"
                disabled={blocked.length < 24}
                onClick={() =>
                  void load(
                    "blocked",
                    blocked.at(-1)?.account_id ?? null,
                    blockPage + 1,
                  )
                }
              >
                Next IDs
              </button>
            </nav>
          </section>
          <section aria-labelledby="safety-report-heading">
            <h2 id="safety-report-heading">Report a concern</h2>
            <p>
              Select one of your retained Hangout IDs to report that Hangout or
              its host. No hidden plan details are restored.
            </p>
            {retainedPhase === "loading" ? (
              <p role="status">Loading retained Hangout IDs…</p>
            ) : retainedPhase === "error" ? (
              <button
                className="text-button"
                onClick={() =>
                  void load(
                    "retained",
                    retainedCursors[retainedPage],
                    retainedPage,
                  )
                }
              >
                Retry retained IDs
              </button>
            ) : retained.length ? (
              <ul className="safety-list">
                {retained.map((row) => (
                  <li key={row.hangout_id}>
                    <div>
                      <code className="safety-id">{row.hangout_id}</code>
                      <small>Your state: {row.own_state}</small>
                    </div>
                    <div className="safety-row-actions">
                      <button
                        className="text-button"
                        onClick={() =>
                          setTarget({ mode: "hangout", id: row.hangout_id })
                        }
                      >
                        Report this Hangout
                      </button>
                      <button
                        className="text-button"
                        onClick={() =>
                          setTarget({
                            mode: "hangout_host",
                            id: row.hangout_id,
                          })
                        }
                      >
                        Report its host
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No retained Hangout IDs on this page.</p>
            )}
            <nav aria-label="Retained Hangout pages" className="safety-pages">
              <button
                className="text-button"
                disabled={retainedPage === 0}
                onClick={() =>
                  void load(
                    "retained",
                    retainedCursors[retainedPage - 1],
                    retainedPage - 1,
                  )
                }
              >
                First or previous IDs
              </button>
              <span>Page {retainedPage + 1}</span>
              <button
                className="text-button"
                disabled={retained.length < 24}
                onClick={() =>
                  void load(
                    "retained",
                    retained.at(-1)?.hangout_id ?? null,
                    retainedPage + 1,
                  )
                }
              >
                Next IDs
              </button>
            </nav>
            {target && (
              <ReportForm
                key={`${safety.epoch}:${target.mode}:${target.id}`}
                actor={actor}
                target={target}
                safety={safety}
                onClose={() => setTarget(null)}
              />
            )}
          </section>
          {listStatus && <p role="alert">{listStatus}</p>}
          {blockId && (
            <BlockDialog
              actor={actor}
              id={blockId}
              blocked
              safety={safety}
              onClose={() => setBlockId(null)}
            />
          )}
          {unblockId && (
            <BlockDialog
              actor={actor}
              id={unblockId}
              blocked={false}
              safety={safety}
              onClose={() => setUnblockId(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

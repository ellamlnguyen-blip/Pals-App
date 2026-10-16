"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DmMessage, DmStatus } from "../../../../lib/dm";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  authTransitionDecision,
  type AuthTransitionMessage,
} from "../../../auth-transition";
import { createDmAuthVerifier } from "../../dm-auth-verifier";
import { recordThreadAttention } from "../../thread-attention";

type Read = {
  kind: string;
  status?: DmStatus;
  messages?: DmMessage[];
  bodyAccess?: boolean;
  peer?: { name: string; photoRevision: number | null } | null;
};
type Pending = {
  key: string;
  body: string;
  action: "send";
};
export function DirectThread({
  id,
  actor,
  onIdentityChange,
}: {
  id: string;
  actor: string;
  onIdentityChange: (
    peer: { name: string; photoRevision: number | null } | null,
  ) => void;
}) {
  const [phase, setPhase] = useState<
    "loading" | "ready" | "denied" | "error" | "unavailable"
  >("loading");
  const [status, setStatus] = useState<DmStatus | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [note, setNote] = useState("Checking direct chat access…");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [maskedHeight, setMaskedHeight] = useState(0);
  const [attention, setAttention] = useState<{
    generation: string;
    sequence: number | null;
    ticket: number;
    accepted: boolean;
  } | null>(null);
  const touched = useRef(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const ticket = useRef(0),
    cursor = useRef<number | null>(null),
    cursors = useRef<(number | null)[]>([null]);
  const pendingRef = useRef<Pending | null>(null),
    draftRef = useRef("");
  const transitions = useRef(new Set<string>()),
    settled = useRef(new Map<string, "settled" | "cancelled">());
  const masked = useRef(true),
    fetching = useRef(false),
    terminal = useRef(false);
  const api = `/api/dm/${id}`;
  const headers = useCallback(() => ({ "x-pals-dm-actor": actor }), [actor]);
  const mask = useCallback(
    (reason = "Checking direct chat access…", preservePage = false) => {
      setMaskedHeight(
        preservePage ? (threadRef.current?.offsetHeight ?? 0) : 0,
      );
      ticket.current++;
      masked.current = true;
      onIdentityChange(null);
      fetching.current = false;
      setMessages([]);
      setAttention(null);
      setStatus(null);
      setDraft("");
      setPending(null);
      setPhase("loading");
      setBusy(false);
      setNote(reason);
      if (!preservePage) {
        cursor.current = null;
        cursors.current = [null];
        setPage(0);
      }
      setMore(false);
    },
    [onIdentityChange],
  );
  const deny = useCallback(
    (kind: "denied" | "unavailable" = "denied") => {
      ticket.current++;
      masked.current = true;
      onIdentityChange(null);
      terminal.current = true;
      fetching.current = false;
      pendingRef.current = null;
      draftRef.current = "";
      setPending(null);
      setDraft("");
      setMessages([]);
      setAttention(null);
      setStatus(null);
      setPhase(kind);
      setBusy(false);
      setNote(
        kind === "denied"
          ? "Direct chat access is unavailable."
          : "This conversation is no longer available.",
      );
      setMaskedHeight(0);
    },
    [onIdentityChange],
  );
  const read = useCallback(
    async (after: number | null, reveal = false, mark = true) => {
      if (
        document.hidden ||
        transitions.current.size ||
        terminal.current ||
        fetching.current
      )
        return false;
      fetching.current = true;
      const now = ticket.current;
      try {
        const url = `${api}${after === null ? "" : `?after=${after}`}`;
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: headers(),
        });
        const data = (await response.json()) as Read;
        if (
          now !== ticket.current ||
          document.hidden ||
          transitions.current.size
        )
          return false;
        if (response.status === 403 || data.kind === "denied") {
          deny();
          return false;
        }
        if (data.kind === "unavailable") {
          deny("unavailable");
          return false;
        }
        if (
          data.kind !== "ok" ||
          !data.status ||
          !Array.isArray(data.messages) ||
          typeof data.bodyAccess !== "boolean"
        ) {
          mask();
          setPhase("error");
          setNote("Could not check this conversation. Try again.");
          return false;
        }
        if (
          reveal &&
          !masked.current &&
          after !== null &&
          data.bodyAccess &&
          data.messages.length === 0
        ) {
          setMore(false);
          setNote("You're caught up.");
          return false;
        }
        setStatus(data.status);

        setMessages(data.bodyAccess ? data.messages : []);
        onIdentityChange(
          data.peer && typeof data.peer.name === "string"
            ? {
                name: data.peer.name,
                photoRevision:
                  typeof data.peer.photoRevision === "number"
                    ? data.peer.photoRevision
                    : null,
              }
            : null,
        );
        if (mark && data.bodyAccess)
          setAttention({
            generation: data.status.generation_id,
            sequence: data.messages.at(-1)?.sequence ?? null,
            ticket: now,
            accepted: data.status.state === "accepted",
          });
        else setAttention(null);
        setMore(data.bodyAccess && data.messages.length === 50);
        masked.current = false;
        setMaskedHeight(0);
        if (data.status.state !== "accepted" || !data.bodyAccess) {
          deny("unavailable");
          return false;
        }
        setPhase("ready");
        if (reveal) {
          setDraft(draftRef.current);
          setPending(pendingRef.current);
        }
        setNote("");
        return true;
      } catch {
        if (now === ticket.current && !document.hidden) {
          mask();
          setPhase("error");
          setNote("Connection interrupted. Try again.");
        }
        return false;
      } finally {
        if (now === ticket.current) fetching.current = false;
      }
    },
    [api, deny, headers, mask, onIdentityChange],
  );
  useEffect(() => {
    const verify = createDmAuthVerifier({
      pending: transitions.current,
      settled: settled.current,
      revision: () => ticket.current,
      active: (startedAt) =>
        startedAt === ticket.current && !document.hidden && !terminal.current,
      probe: async () => {
        const response = await fetch(api, {
          cache: "no-store",
          credentials: "same-origin",
          headers: headers(),
        });
        return response.status;
      },
      deny: () => deny(),
      reauthorize: () => {
        mask("Account checked. Rechecking conversation…");
        void read(null, true);
      },
    });
    const resume = () => {
      if (document.hidden || terminal.current) return;
      touched.current = false;
      mask("Checking direct chat access…", true);
      if (transitions.current.size)
        for (const [token, phase] of settled.current)
          void verify({ token, phase });
      else void read(cursor.current, true);
    };
    const transition = (message: AuthTransitionMessage) => {
      const decision = authTransitionDecision(transitions.current, message);
      if (decision === "mask") {
        mask("Account change in progress. Conversation hidden.");
        pendingRef.current = null;
        draftRef.current = "";
      } else if (
        decision === "verify" &&
        "token" in message &&
        message.phase !== "begin"
      ) {
        settled.current.set(message.token, message.phase);
        void verify(message);
      } else if (decision === "reauthorize") resume();
    };
    const local = (event: Event) =>
      transition((event as CustomEvent<AuthTransitionMessage>).detail);
    const storage = (event: StorageEvent) => {
      if (event.key?.includes("auth-token")) resume();
    };
    const visibility = () => {
      if (document.hidden) {
        mask("Conversation hidden. Checking again on return.", true);
      } else resume();
    };
    const pagehide = () => {
      mask("Conversation hidden. Checking again on return.", true);
    };
    resume();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("storage", storage);
    window.addEventListener(AUTH_TRANSITION_EVENT, local);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
      transition(event.data);
    const interval = window.setInterval(() => {
      if (!document.hidden && !masked.current && !transitions.current.size)
        void read(cursor.current);
    }, 8000);
    return () => {
      mask();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("storage", storage);
      window.removeEventListener(AUTH_TRANSITION_EVENT, local);
      channel.close();
    };
  }, [api, deny, headers, mask, read]);
  useEffect(() => {
    if (
      !attention ||
      phase !== "ready" ||
      masked.current ||
      document.hidden ||
      transitions.current.size ||
      ticket.current !== attention.ticket
    )
      return;
    const shouldTouch = attention.accepted && !touched.current;
    if (shouldTouch) touched.current = true;
    void recordThreadAttention(
      actor,
      "dm",
      attention.generation,
      attention.sequence,
      shouldTouch,
    );
  }, [actor, attention, phase]);
  async function navigate(next: number | null, index: number) {
    if (busy || !(await read(next, true))) return;
    cursor.current = next;
    setPage(index);
  }
  async function mutate(action: "close" | "send") {
    if (
      !status ||
      busy ||
      document.hidden ||
      transitions.current.size ||
      masked.current
    )
      return;
    const current = status;
    const body = pendingRef.current?.body ?? draftRef.current.trim();
    if (action === "send" && (!body || body.length > 2000)) {
      setNote("Write 1 to 2000 characters.");
      return;
    }
    const item =
      action === "send"
        ? (pendingRef.current ?? {
            key: crypto.randomUUID(),
            body,
            action: "send",
          })
        : null;
    if (item && item.action !== action) {
      setNote("Finish the original retry before another message.");
      return;
    }
    if (item) {
      pendingRef.current = item;
      setPending(item);
    }
    setBusy(true);
    setNote(
      item && pending ? "Checking before retry…" : "Checking current access…",
    );
    const now = ticket.current;
    if (
      !(await read(cursor.current, false, false)) ||
      now !== ticket.current ||
      document.hidden
    ) {
      setBusy(false);
      return;
    }
    if (status?.generation_id !== current.generation_id) {
      setNote("Conversation changed. Reload before acting.");
      setBusy(false);
      return;
    }
    if (action === "send" && phase !== "ready") {
      setNote("Message access changed. Reload before sending.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(api, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          generation: current.generation_id,
          key: item?.key,
          body: item?.body,
        }),
      });
      const data = (await response.json()) as { kind: string };
      if (now !== ticket.current || document.hidden) return;
      if (data.kind === "denied") {
        // A failed mutation can mean source access changed between the read and
        // POST. Hide the old body before any network reread can settle.
        mask("Rechecking direct chat access…", true);
        if (await read(null, true))
          setNote(
            "This action is unavailable now. Check the current conversation before trying again.",
          );
        return;
      }
      if (data.kind === "stale" || data.kind === "conflict") {
        setNote(
          "Conversation changed or this retry differs. Reload before another action.",
        );
        return;
      }
      if (data.kind !== "ok") {
        setNote(
          item
            ? "Outcome uncertain. Retry the same message after a fresh check."
            : "Outcome uncertain. Reload to check before another action.",
        );
        return;
      }
      if (item) {
        pendingRef.current = null;
        setPending(null);
        draftRef.current = "";
        setDraft("");
      }
      if (action === "close") {
        deny("unavailable");
        return;
      }
      const sentFromFullPage = action === "send" && messages.length === 50;
      mask("Checking updated conversation…", action === "send");
      if (await read(action === "send" ? cursor.current : null, true, false))
        setNote(
          sentFromFullPage
            ? "Message sent. Load newer messages to see it."
            : "Message sent.",
        );
    } catch {
      if (now === ticket.current)
        setNote(
          item
            ? "Outcome uncertain. Retry the same message after a fresh check."
            : "Outcome uncertain. Reload to check before another action.",
        );
    } finally {
      if (now === ticket.current) setBusy(false);
    }
  }
  return (
    <div
      className="chat-thread"
      ref={threadRef}
      style={maskedHeight ? { minHeight: maskedHeight } : undefined}
      aria-live="polite"
    >
      {phase === "loading" && <p role="status">Checking direct chat access…</p>}
      {(phase === "denied" || phase === "unavailable" || phase === "error") && (
        <div className="chat-empty">
          <h2>
            {phase === "error"
              ? "Could not load chat"
              : "Direct chat unavailable"}
          </h2>
          <p>{note}</p>
          {phase === "error" && (
            <button
              className="quiet-button"
              onClick={() => void read(null, true)}
            >
              Try again
            </button>
          )}
          <Link href="/people">Return to Pals</Link>
        </div>
      )}
      {status && phase === "ready" && (
        <>
          <ol className="chat-messages">
            {messages.map((message) => (
              <li
                key={message.message_id}
                className={message.mine ? "chat-mine" : ""}
              >
                <div className="chat-meta">
                  <strong>{message.mine ? "You" : "Peer"}</strong>
                  <time dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleString()}
                  </time>
                </div>
                <p>{message.body}</p>
              </li>
            ))}
          </ol>
          <div className="chat-page-actions">
            <button
              className="quiet-button"
              disabled={page === 0 || busy}
              onClick={() => void navigate(cursors.current[page - 1], page - 1)}
            >
              Previous
            </button>
            <button
              className="quiet-button"
              disabled={!more || busy}
              onClick={() => {
                const next = messages.at(-1)?.sequence;
                if (next) {
                  cursors.current[page + 1] = next;
                  void navigate(next, page + 1);
                }
              }}
            >
              Load newer
            </button>
          </div>
          <div className="chat-composer">
            <label className="sr-only" htmlFor="dm-draft">
              Message
            </label>
            <textarea
              id="dm-draft"
              value={pending?.body ?? draft}
              disabled={busy || !!pending}
              maxLength={2000}
              onChange={(event) => {
                draftRef.current = event.target.value;
                setDraft(event.target.value);
              }}
            />
            <div className="chat-page-actions">
              <button
                className="button"
                disabled={busy}
                onClick={() => void mutate("send")}
              >
                {pending ? "Retry same message" : "Send message"}
              </button>
            </div>
          </div>
          <div className="chat-page-actions dm-management">
            <button
              className="quiet-button"
              disabled={busy || !!pending}
              onClick={() => void mutate("close")}
            >
              Close chat
            </button>
          </div>
        </>
      )}
      {note && phase === "ready" && (
        <p className="chat-status" role="status">
          {note}
        </p>
      )}
    </div>
  );
}

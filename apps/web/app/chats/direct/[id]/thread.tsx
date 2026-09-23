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

type Read = {
  kind: string;
  status?: DmStatus;
  messages?: DmMessage[];
  bodyAccess?: boolean;
};
type Pending = { key: string; body: string; action: "reply" | "send" };
export function DirectThread({
  id,
  actor,
  ready,
}: {
  id: string;
  actor: string;
  ready: boolean;
}) {
  const [phase, setPhase] = useState<
    | "loading"
    | "ready"
    | "paused"
    | "waiting"
    | "denied"
    | "error"
    | "unavailable"
  >("loading");
  const [status, setStatus] = useState<DmStatus | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [note, setNote] = useState("Checking direct chat access…");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
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
  const mask = useCallback((reason = "Checking direct chat access…") => {
    ticket.current++;
    masked.current = true;
    fetching.current = false;
    setMessages([]);
    setStatus(null);
    setDraft("");
    setPending(null);
    setPhase("loading");
    setBusy(false);
    setNote(reason);
    cursor.current = null;
    cursors.current = [null];
    setPage(0);
    setMore(false);
  }, []);
  const deny = useCallback((kind: "denied" | "unavailable" = "denied") => {
    ticket.current++;
    masked.current = true;
    terminal.current = true;
    fetching.current = false;
    pendingRef.current = null;
    draftRef.current = "";
    setPending(null);
    setDraft("");
    setMessages([]);
    setStatus(null);
    setPhase(kind);
    setBusy(false);
    setNote(
      kind === "denied"
        ? "Direct chat access is unavailable."
        : "This conversation is no longer available.",
    );
  }, []);
  const read = useCallback(
    async (after: number | null, reveal = false) => {
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
          after !== null &&
          data.bodyAccess &&
          data.messages.length === 0
        ) {
          setMore(false);
          setNote("You're caught up.");
          return false;
        }
        setStatus(data.status);
        if (!data.bodyAccess && data.status.direction !== "outgoing") {
          pendingRef.current = null;
          draftRef.current = "";
          setPending(null);
          setDraft("");
        }
        setMessages(data.bodyAccess ? data.messages : []);
        setMore(data.bodyAccess && data.messages.length === 50);
        masked.current = false;
        if (
          data.status.state === "pending" &&
          data.status.direction === "outgoing"
        )
          setPhase("waiting");
        else setPhase(data.bodyAccess ? "ready" : "paused");
        if (reveal) {
          setDraft(draftRef.current);
          setPending(pendingRef.current);
        }
        setNote(
          data.status.state === "pending" &&
            data.status.direction === "outgoing"
            ? "Waiting for their choice."
            : data.bodyAccess
              ? "Conversation checked."
              : "Message access is paused.",
        );
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
    [api, deny, headers, mask],
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
      mask();
      if (transitions.current.size)
        for (const [token, phase] of settled.current)
          void verify({ token, phase });
      else void read(null, true);
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
        mask("Conversation hidden. Checking again on return.");
        pendingRef.current = null;
        draftRef.current = "";
      } else resume();
    };
    const pagehide = () => {
      mask("Conversation hidden. Checking again on return.");
      pendingRef.current = null;
      draftRef.current = "";
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
  async function navigate(next: number | null, index: number) {
    if (busy || !(await read(next, true))) return;
    cursor.current = next;
    setPage(index);
  }
  async function mutate(
    action:
      "accept" | "reply" | "ignore" | "withdraw" | "close" | "send" | "block",
  ) {
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
    if (["reply", "send"].includes(action) && (!body || body.length > 2000)) {
      setNote("Write 1 to 2000 characters.");
      return;
    }
    const item = ["reply", "send"].includes(action)
      ? (pendingRef.current ?? {
          key: crypto.randomUUID(),
          body,
          action: action as "reply" | "send",
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
      !(await read(cursor.current)) ||
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
    if (
      (action === "reply" || action === "send" || action === "accept") &&
      phase !== "ready"
    ) {
      setNote("Message access is paused. Try again after eligibility returns.");
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
        deny();
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
          action === "block"
            ? "Block outcome uncertain. Check outbound blocked IDs before another action. Any confirmed block ends this direct chat; existing Hangout access and chat are unchanged."
            : item
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
      if (["ignore", "withdraw", "close", "block"].includes(action)) {
        deny("unavailable");
        if (action === "block")
          setNote(
            "Block confirmed. People discovery, friendship and this direct chat ended. Existing Hangout access and chat are unchanged.",
          );
        return;
      }
      mask("Checking updated conversation…");
      if (await read(null, true))
        setNote(action === "accept" ? "Request accepted." : "Message sent.");
    } catch {
      if (now === ticket.current)
        setNote(
          action === "block"
            ? "Block outcome uncertain. Check outbound blocked IDs before another action. Any confirmed block ends this direct chat; existing Hangout access and chat are unchanged."
            : item
              ? "Outcome uncertain. Retry the same message after a fresh check."
              : "Outcome uncertain. Reload to check before another action.",
        );
    } finally {
      if (now === ticket.current) setBusy(false);
    }
  }
  return (
    <div className="chat-thread" aria-live="polite">
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
          <Link href="/chats">Back to Chats</Link>
        </div>
      )}
      {status &&
        (phase === "ready" || phase === "waiting" || phase === "paused") && (
          <>
            <p className="dm-peer">
              Peer ID <code>{id}</code>
            </p>
            {phase === "waiting" && (
              <div className="chat-empty">
                <h2>Waiting for their choice</h2>
                <p>
                  Your first message is in their Requests. You cannot send
                  another unless they accept or reply.
                </p>
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={() => void mutate("withdraw")}
                >
                  Withdraw request
                </button>
              </div>
            )}
            {phase === "paused" && (
              <div className="chat-empty">
                <h2>Message access paused</h2>
                <p>
                  A current access condition changed. All message text,
                  including your own, is hidden. Turning People sharing off
                  pauses an accepted chat; access can resume if both people
                  become eligible again. Ending it is permanent for this
                  conversation.
                </p>
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      status.state === "accepted"
                        ? "close"
                        : status.direction === "incoming"
                          ? "ignore"
                          : "withdraw",
                    )
                  }
                >
                  {status.state === "accepted"
                    ? "Close chat"
                    : status.direction === "incoming"
                      ? "Ignore request"
                      : "Withdraw request"}
                </button>
                {ready && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Block this ID in People? This ends People discovery, friendship and this direct chat. Existing Hangout access and chat are unchanged.",
                        )
                      )
                        void mutate("block");
                    }}
                  >
                    Block in People
                  </button>
                )}
              </div>
            )}
            {phase === "ready" && (
              <>
                <h2>
                  {status.state === "pending" ? "Request" : "Conversation"}
                </h2>
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
                {status.state === "accepted" && (
                  <div className="chat-page-actions">
                    <button
                      className="quiet-button"
                      disabled={page === 0 || busy}
                      onClick={() =>
                        void navigate(cursors.current[page - 1], page - 1)
                      }
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
                )}
                {status.state === "pending" && (
                  <p>
                    Accepting or replying opens a direct chat. Ignoring ends
                    this request.
                  </p>
                )}
                <div className="chat-composer">
                  <label htmlFor="dm-draft">
                    {status.state === "pending"
                      ? "Reply and accept"
                      : "Message"}
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
                  <p className="help">
                    Plain text · 1–2000 characters · Enter adds a line
                  </p>
                  <div className="chat-page-actions">
                    {status.state === "pending" && (
                      <button
                        className="quiet-button"
                        disabled={busy}
                        onClick={() => void mutate("accept")}
                      >
                        Accept without reply
                      </button>
                    )}
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          status.state === "pending" ? "reply" : "send",
                        )
                      }
                    >
                      {pending
                        ? "Retry same message"
                        : status.state === "pending"
                          ? "Reply and accept"
                          : "Send message"}
                    </button>
                  </div>
                </div>
                <div className="chat-page-actions dm-management">
                  {status.state === "pending" ? (
                    <button
                      className="quiet-button"
                      disabled={busy}
                      onClick={() => void mutate("ignore")}
                    >
                      Ignore request
                    </button>
                  ) : (
                    <button
                      className="quiet-button"
                      disabled={busy}
                      onClick={() => void mutate("close")}
                    >
                      Close chat
                    </button>
                  )}
                  <button
                    className="text-button"
                    disabled={busy || !ready}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Block this ID in People? This ends People discovery, friendship and this direct chat. Existing Hangout access and chat are unchanged.",
                        )
                      )
                        void mutate("block");
                    }}
                  >
                    Block in People
                  </button>
                </div>
              </>
            )}
          </>
        )}
      <p className="chat-status" role="status">
        {note}
      </p>
    </div>
  );
}

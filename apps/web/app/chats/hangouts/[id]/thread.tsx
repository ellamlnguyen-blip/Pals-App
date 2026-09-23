"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ChatMessage } from "../../../../lib/chat";
import { fetchVisiblePage, nextPageCursors } from "./page-data";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  authTransitionDecision,
  authVerificationDecision,
  type AuthTransitionMessage,
} from "../../../auth-transition";

type SendResult =
  | { kind: "ok"; message: ChatMessage }
  | { kind: "denied" | "error" | "invalid" | "conflict" };
type Pending = { key: string; body: string };

export function Thread({ id, userId }: { id: string; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">(
    "loading",
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [more, setMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const latest = useRef(0);
  const pageAfter = useRef<number | null>(null);
  const pageCursors = useRef<(number | null)[]>([null]);
  const visible = useRef(false);
  const draftRef = useRef("");
  const pendingRef = useRef<Pending | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const authPending = useRef(new Set<string>());
  const authSettled = useRef(new Map<string, "settled" | "cancelled">());
  const terminalDenial = useRef(false);
  const api = `/api/chat/${id}`;

  const mask = useCallback((reason: "hidden" | "auth" = "hidden") => {
    generation.current++;
    visible.current = false;
    busy.current = false;
    latest.current = 0;
    pageAfter.current = null;
    pageCursors.current = [null];
    setPageIndex(0);
    setMessages([]);
    setMore(false);
    setState("loading");
    setDraft("");
    setPending(null);
    if (reason === "auth") {
      draftRef.current = "";
      pendingRef.current = null;
    }
    setSending(false);
    setStatus(
      reason === "auth"
        ? "Account changed. Checking chat access again."
        : "Checking chat access again.",
    );
  }, []);
  const deny = useCallback(() => {
    terminalDenial.current = true;
    authPending.current.clear();
    authSettled.current.clear();
    generation.current++;
    visible.current = false;
    busy.current = false;
    latest.current = 0;
    pageAfter.current = null;
    pageCursors.current = [null];
    setPageIndex(0);
    setMessages([]);
    setMore(false);
    setDraft("");
    draftRef.current = "";
    setPending(null);
    pendingRef.current = null;
    setSending(false);
    setState("denied");
    setStatus("Chat access is unavailable.");
  }, []);
  const read = useCallback(
    async (after: number | null, reveal = false) => {
      if (
        terminalDenial.current ||
        document.hidden ||
        busy.current ||
        authPending.current.size
      )
        return false;
      busy.current = true;
      const ticket = generation.current;
      try {
        const { status: responseStatus, data } = await fetchVisiblePage(
          api,
          userId,
          after,
        );
        if (ticket !== generation.current || document.hidden) return false;
        if (data.kind === "denied" || responseStatus === 403) {
          deny();
          return false;
        }
        if (data.kind !== "ok") {
          mask();
          setState("error");
          setStatus("Could not check chat. Try again.");
          return false;
        }
        if (reveal && after !== null && data.messages.length === 0) {
          setMore(false);
          setStatus("You're caught up.");
          return false;
        }
        if (reveal) {
          setMessages(data.messages);
          setDraft(draftRef.current);
          setPending(pendingRef.current);
          setMore(data.messages.length === 50);
          latest.current = data.messages.at(-1)?.sequence ?? 0;
          visible.current = true;
          setState("ready");
          setStatus(data.messages.length ? "Chat ready." : "No messages yet.");
        } else {
          setMessages(data.messages);
          setMore(data.messages.length === 50);
          latest.current = data.messages.at(-1)?.sequence ?? after ?? 0;
        }
        return true;
      } catch {
        if (ticket === generation.current && !document.hidden) {
          mask();
          setState("error");
          setStatus("Connection interrupted. Try again.");
        }
        return false;
      } finally {
        if (ticket === generation.current) busy.current = false;
      }
    },
    [api, deny, mask, userId],
  );

  // The displayed page has one forward cursor, so each poll reprojects at most
  // 50 visible authors without silently walking the full conversation.
  const refreshProjection = useCallback(() => {
    if (terminalDenial.current || !visible.current || authPending.current.size)
      return;
    void read(pageAfter.current);
  }, [read]);

  useEffect(() => {
    const verifyTransition = async (
      message: Extract<AuthTransitionMessage, { token: string }>,
    ) => {
      if (
        terminalDenial.current ||
        document.hidden ||
        !authPending.current.has(message.token)
      )
        return;
      const ticket = generation.current;
      try {
        const response = await fetch(api, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "x-pals-chat-actor": userId },
        });
        if (ticket !== generation.current || document.hidden) return;
        // This response is an identity/authorization probe. Never copy its
        // message body into state while a transition is pending.
        const decision = authVerificationDecision(
          authPending.current,
          message,
          response.status,
        );
        if (!authPending.current.has(message.token))
          authSettled.current.delete(message.token);
        if (decision === "deny") deny();
        else if (decision === "reauthorize") {
          reauthorize();
        }
      } catch {
        // Network uncertainty keeps private content masked.
      }
    };
    const verifySettled = () => {
      for (const [token, phase] of authSettled.current) {
        void verifyTransition({ phase, token });
      }
    };
    const resume = () => {
      if (document.hidden) return;
      if (terminalDenial.current) {
        deny();
        return;
      }
      mask();
      if (authPending.current.size) verifySettled();
      else void read(null, true);
    };
    const hide = () => mask();
    const reauthorize = () => {
      if (terminalDenial.current) return;
      mask("auth");
      if (!document.hidden && !authPending.current.size) void read(null, true);
    };
    const transition = (message: AuthTransitionMessage) => {
      if (terminalDenial.current) return;
      const decision = authTransitionDecision(authPending.current, message);
      if (decision === "mask") {
        mask("auth");
        setStatus("Account change in progress. Chat is hidden.");
      } else if (
        decision === "verify" &&
        (message.phase === "settled" || message.phase === "cancelled")
      ) {
        authSettled.current.set(message.token, message.phase);
        void verifyTransition(message);
      } else if (decision === "reauthorize") reauthorize();
    };
    const onLocalTransition = (event: Event) =>
      transition((event as CustomEvent<AuthTransitionMessage>).detail);
    const onStorage = (event: StorageEvent) => {
      if (event.key?.includes("auth-token")) reauthorize();
    };
    resume();
    const visibilityChange = () => {
      if (document.hidden) hide();
      else resume();
    };
    document.addEventListener("visibilitychange", visibilityChange);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_TRANSITION_EVENT, onLocalTransition);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
      transition(event.data);
    const interval = window.setInterval(() => {
      if (terminalDenial.current || document.hidden) return;
      if (authPending.current.size) verifySettled();
      else if (visible.current) refreshProjection();
    }, 8000);
    return () => {
      mask("auth");
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibilityChange);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_TRANSITION_EVENT, onLocalTransition);
      channel.close();
    };
  }, [api, deny, mask, read, refreshProjection, userId]);

  async function showNewerPage() {
    if (!more || sending || !latest.current) return;
    const ticket = generation.current;
    const nextAfter = latest.current;
    if (!(await read(nextAfter, true)) || ticket !== generation.current) return;
    pageCursors.current = nextPageCursors(
      pageCursors.current,
      pageIndex,
      nextAfter,
    );
    pageAfter.current = nextAfter;
    setPageIndex(pageIndex + 1);
  }

  async function showPreviousPage() {
    if (pageIndex === 0 || sending) return;
    const ticket = generation.current;
    const previous = pageCursors.current[pageIndex - 1];
    if (!(await read(previous, true)) || ticket !== generation.current) return;
    pageAfter.current = previous;
    setPageIndex(pageIndex - 1);
  }

  async function send() {
    if (
      sending ||
      state !== "ready" ||
      document.hidden ||
      authPending.current.size
    )
      return;
    const body = pendingRef.current?.body ?? draftRef.current.trim();
    if (!body || body.length > 2000) {
      setStatus("Write 1 to 2000 characters.");
      return;
    }
    const retry = !!pendingRef.current;
    const item = pendingRef.current ?? { key: crypto.randomUUID(), body };
    pendingRef.current = item;
    setPending(item);
    setSending(true);
    setStatus(retry ? "Checking before retry…" : "Checking before send…");
    const ticket = generation.current;
    const authorized = await read(pageAfter.current);
    if (!authorized || ticket !== generation.current || document.hidden) {
      setSending(false);
      return;
    }
    let sent = false;
    try {
      const response = await fetch(api, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-pals-chat-actor": userId,
        },
        body: JSON.stringify(item),
      });
      const result = (await response.json()) as SendResult;
      if (ticket !== generation.current || document.hidden) return;
      if (result.kind === "denied" || response.status === 403) {
        deny();
        return;
      }
      if (result.kind === "ok") {
        pendingRef.current = null;
        setPending(null);
        if (draftRef.current.trim() === item.body) {
          draftRef.current = "";
          setDraft("");
        }
        sent = true;
        await read(pageAfter.current);
        setStatus("Message sent.");
      } else if (result.kind === "conflict")
        setStatus(
          "This retry no longer matches the original message. Reload chat before sending again.",
        );
      else
        setStatus(
          "Send outcome uncertain. Retry the original message with the same request key.",
        );
    } catch {
      if (ticket === generation.current)
        setStatus(
          "Send outcome uncertain. Retry the original message with the same request key.",
        );
    } finally {
      if (ticket === generation.current) {
        // The pending button loses native focus when disabled. Commit its
        // enabled state before focusing the composer for keyboard continuity.
        flushSync(() => setSending(false));
        if (sent && !document.hidden && composerRef.current) {
          composerRef.current.focus({ preventScroll: true });
        }
      }
    }
  }
  return (
    <div className="chat-thread">
      {state === "loading" && <p role="status">Checking chat access…</p>}
      {state === "denied" && (
        <div className="chat-empty">
          <h2>Chat unavailable</h2>
          <p>Your Hangout or account access may have changed.</p>
        </div>
      )}
      {state === "error" && (
        <div className="chat-empty">
          <h2>Could not load chat</h2>
          <button
            className="quiet-button"
            onClick={() => void read(null, true)}
          >
            Try again
          </button>
        </div>
      )}
      {state === "ready" && (
        <>
          <h2>Conversation</h2>
          {messages.length === 0 ? (
            <p className="chat-empty">
              No messages yet. Start coordinating the plan.
            </p>
          ) : (
            <ol className="chat-messages">
              {messages.map((message) => (
                <li
                  key={message.message_id}
                  className={message.mine ? "chat-mine" : ""}
                >
                  <div className="chat-meta">
                    <strong>
                      {message.mine
                        ? "You"
                        : (message.author_id ??
                          message.author_label ??
                          "Former participant")}
                    </strong>
                    <time dateTime={message.created_at}>
                      {new Date(message.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                  <p>{message.body}</p>
                </li>
              ))}
            </ol>
          )}
          {(pageIndex > 0 || more) && (
            <div className="chat-page-actions">
              {pageIndex > 0 && (
                <button
                  className="quiet-button"
                  disabled={sending}
                  onClick={() => void showPreviousPage()}
                >
                  Previous messages
                </button>
              )}
              {more && (
                <button
                  className="quiet-button"
                  disabled={sending}
                  onClick={() => void showNewerPage()}
                >
                  Load newer messages
                </button>
              )}
            </div>
          )}
          <form
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="chat-message">Message</label>
            <textarea
              id="chat-message"
              ref={composerRef}
              value={draft}
              onChange={(event) => {
                const value = event.target.value;
                setDraft(value);
                draftRef.current = value;
              }}
              maxLength={2000}
              rows={4}
              aria-describedby="chat-count chat-disclosure"
              placeholder="What should everyone know?"
            />
            <div className="chat-compose-row">
              <span id="chat-count">
                {draft.trim().length} / 2000 characters
              </span>
              <button
                className="button"
                disabled={sending || (!draft.trim() && !pending)}
                type="submit"
              >
                {sending
                  ? "Sending…"
                  : pending
                    ? "Retry original message"
                    : "Send message"}
              </button>
            </div>
            <p id="chat-disclosure" className="help">
              Future eligible joiners can read chat history. Confirmed blocks
              can end shared Hangout attendance and hide messages from blocked
              peers. Creating a new block is temporarily unavailable.
            </p>
            {pending && (
              <p className="help">
                Retry uses the original text, even if you changed this draft.
              </p>
            )}
          </form>
        </>
      )}
      <p className="chat-status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

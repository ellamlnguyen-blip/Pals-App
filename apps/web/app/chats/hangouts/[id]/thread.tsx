"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ChatMessage } from "../../../../lib/chat";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  authTransitionDecision,
  type AuthTransitionMessage,
} from "../../../auth-transition";

type ReadResult =
  | { kind: "ok"; messages: ChatMessage[] }
  | { kind: "denied" | "error" | "invalid" };
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
  const generation = useRef(0);
  const busy = useRef(false);
  const latest = useRef(0);
  const visible = useRef(false);
  const draftRef = useRef("");
  const pendingRef = useRef<Pending | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const authPending = useRef(new Set<string>());
  const api = `/api/chat/${id}`;

  const mask = useCallback((reason: "hidden" | "auth" = "hidden") => {
    generation.current++;
    visible.current = false;
    busy.current = false;
    latest.current = 0;
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
    generation.current++;
    visible.current = false;
    busy.current = false;
    latest.current = 0;
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
      if (document.hidden || busy.current || authPending.current.size)
        return false;
      busy.current = true;
      const ticket = generation.current;
      try {
        const response = await fetch(
          `${api}${after ? `?after=${after}` : ""}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            headers: { "x-pals-chat-actor": userId },
          },
        );
        const data = (await response.json()) as ReadResult;
        if (ticket !== generation.current || document.hidden) return false;
        if (data.kind === "denied" || response.status === 403) {
          deny();
          return false;
        }
        if (data.kind !== "ok") {
          if (reveal) setState("error");
          setStatus("Could not check chat. Try again.");
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
          setMore(data.messages.length === 50);
          if (data.messages.length) {
            setMessages((current) => {
              const known = new Set(current.map((item) => item.message_id));
              return [
                ...current,
                ...data.messages.filter((item) => !known.has(item.message_id)),
              ].sort((a, b) => a.sequence - b.sequence);
            });
            latest.current = Math.max(
              latest.current,
              data.messages.at(-1)?.sequence ?? 0,
            );
          }
        }
        return true;
      } catch {
        if (ticket === generation.current && !document.hidden) {
          if (reveal) setState("error");
          setStatus("Connection interrupted. Try again.");
        }
        return false;
      } finally {
        if (ticket === generation.current) busy.current = false;
      }
    },
    [api, deny, userId],
  );

  // Reproject displayed history on each visible poll. A forward-only tail read
  // would leave an old peer account ID on screen after that author leaves.
  const refreshProjection = useCallback(async () => {
    if (
      document.hidden ||
      busy.current ||
      !visible.current ||
      authPending.current.size
    )
      return false;
    busy.current = true;
    const ticket = generation.current;
    const through = latest.current;
    const refreshed: ChatMessage[] = [];
    let cursor: number | null = null;
    let lastCount = 0;
    let checkedTail = false;
    try {
      do {
        const response = await fetch(
          `${api}${cursor ? `?after=${cursor}` : ""}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            headers: { "x-pals-chat-actor": userId },
          },
        );
        const result = (await response.json()) as ReadResult;
        if (ticket !== generation.current || document.hidden) return false;
        if (result.kind === "denied" || response.status === 403) {
          deny();
          return false;
        }
        if (result.kind !== "ok") {
          setStatus("Could not check chat. Try again.");
          return false;
        }
        refreshed.push(...result.messages);
        lastCount = result.messages.length;
        cursor = result.messages.at(-1)?.sequence ?? cursor;
        if (lastCount < 50 || !cursor) break;
        if (cursor >= through) {
          if (checkedTail) break;
          checkedTail = true;
        }
      } while (true);
      if (ticket !== generation.current || document.hidden) return false;
      setMessages(refreshed);
      latest.current = cursor ?? 0;
      setMore(lastCount === 50);
      return true;
    } catch {
      if (ticket === generation.current && !document.hidden)
        setStatus("Connection interrupted. Try again.");
      return false;
    } finally {
      if (ticket === generation.current) busy.current = false;
    }
  }, [api, deny, userId]);

  useEffect(() => {
    const resume = () => {
      if (document.hidden) return;
      mask();
      if (!authPending.current.size) void read(null, true);
    };
    const hide = () => mask();
    const reauthorize = () => {
      mask("auth");
      if (!document.hidden && !authPending.current.size) void read(null, true);
    };
    const transition = (message: AuthTransitionMessage) => {
      const decision = authTransitionDecision(authPending.current, message);
      if (decision === "mask") {
        mask("auth");
        setStatus("Account change in progress. Chat is hidden.");
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
      if (visible.current && !document.hidden) void refreshProjection();
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
  }, [mask, read, refreshProjection]);

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
    const authorized = await read(latest.current || null);
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
        setStatus("Message sent.");
        sent = true;
        await read(latest.current || null);
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
          {more && (
            <button
              className="quiet-button"
              disabled={sending}
              onClick={() => void read(latest.current || null)}
            >
              Load newer messages
            </button>
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
              Future eligible joiners can read the full chat history. People
              blocking does not mute this local Hangout chat.
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

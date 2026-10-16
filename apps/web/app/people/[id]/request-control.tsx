"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
} from "../../auth-transition";

type Pending = { key: string; body: string };
export type PeerDmState = "accepted" | "none" | "unknown";

export function RequestControl({
  peerId,
  actor,
  state,
  friends,
  onSent,
  onUnavailable,
}: {
  peerId: string;
  actor: string;
  state: PeerDmState;
  friends: boolean;
  onSent: () => void;
  onUnavailable: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [masked, setMasked] = useState(false);
  const current = useRef<Pending | null>(null);
  const ticket = useRef(0);
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  }, [onUnavailable]);
  const hide = useCallback(() => {
    ticket.current++;
    current.current = null;
    setDraft("");
    setPending(null);
    setSent(false);
    setMasked(true);
    setBusy(false);
    unavailable.current();
  }, []);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) hide();
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    window.addEventListener(AUTH_TRANSITION_EVENT, hide);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = hide;
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener(AUTH_TRANSITION_EVENT, hide);
      channel.close();
    };
  }, [hide]);
  async function send() {
    if (busy || masked || !friends || state !== "none" || document.hidden)
      return;
    const body = current.current?.body ?? draft.trim();
    if (!body || body.length > 2000) {
      setNote("Write 1 to 2000 characters.");
      return;
    }
    const item = current.current ?? { key: crypto.randomUUID(), body };
    current.current = item;
    setPending(item);
    setBusy(true);
    setNote(pending ? "Checking before retry…" : "Sending first message…");
    const now = ticket.current;
    try {
      const response = await fetch("/api/dm", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-pals-dm-actor": actor,
        },
        body: JSON.stringify({ peer: peerId, ...item, mode: "friend" }),
      });
      const data = (await response.json()) as { kind: string };
      if (now !== ticket.current || document.hidden) return;
      if (data.kind === "ok") {
        current.current = null;
        setPending(null);
        setDraft("");
        setSent(true);
        onSent();
        setNote("Message sent. Your direct chat is ready.");
      } else if (data.kind === "denied" || data.kind === "stale") {
        hide();
      } else if (data.kind === "conflict") {
        setNote(
          "This retry differs from the original message. Reload before another action.",
        );
      } else {
        setNote(
          "Outcome uncertain. Retry the same message after a fresh check.",
        );
      }
    } catch {
      if (now === ticket.current)
        setNote(
          "Outcome uncertain. Retry the same message after a fresh check.",
        );
    } finally {
      if (now === ticket.current) setBusy(false);
    }
  }
  if (!friends || masked) return null;
  return (
    <section
      className="people-preview dm-request"
      aria-labelledby="request-heading"
    >
      <h2 id="request-heading" tabIndex={-1}>
        Say hello
      </h2>
      {state === "accepted" || sent ? (
        <Link href={`/chats/direct/${peerId}`}>Open chat</Link>
      ) : state === "unknown" ? (
        <a href={`/people/${peerId}`}>Reload to check chat availability</a>
      ) : (
        <>
          <label htmlFor="dm-request-body">First message</label>
          <textarea
            id="dm-request-body"
            value={pending?.body ?? draft}
            maxLength={2000}
            disabled={busy || !!pending}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="button"
            disabled={busy}
            onClick={() => void send()}
          >
            {pending ? "Retry same message" : "Send message"}
          </button>
        </>
      )}
      {note && <p role="status">{note}</p>}
    </section>
  );
}

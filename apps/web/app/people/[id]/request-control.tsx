"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { analytics } from "../../../lib/analytics";
import { firstRequestConfirmed } from "../../../lib/analytics-evidence";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
} from "../../auth-transition";
type Pending = { key: string; body: string };
export type PeerDmState = "accepted" | "pending" | "none" | "unknown";
export function RequestControl({
  peerId,
  actor,
  state,
  onSent,
  onUnavailable,
}: {
  peerId: string;
  actor: string;
  state: PeerDmState;
  onSent: () => void;
  onUnavailable: () => void;
}) {
  const [draft, setDraft] = useState(""),
    [pending, setPending] = useState<Pending | null>(null),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [sent, setSent] = useState(false),
    [masked, setMasked] = useState(false);
  const current = useRef<Pending | null>(null),
    ticket = useRef(0);
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  }, [onUnavailable]);
  const hide = useCallback(() => {
    ticket.current++;
    setDraft("");
    setPending(null);
    setSent(false);
    current.current = null;
    setMasked(true);
    setBusy(false);
    setNote("People access changed. Reload this profile to start a request.");
    unavailable.current();
  }, []);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) hide();
    };
    const local = () => hide();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    window.addEventListener(AUTH_TRANSITION_EVENT, local);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = () => hide();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener(AUTH_TRANSITION_EVENT, local);
      channel.close();
    };
  }, [hide]);
  async function send() {
    if (busy || masked || document.hidden) return;
    const body = current.current?.body ?? draft.trim();
    if (!body || body.length > 2000) {
      setNote("Write 1 to 2000 characters.");
      return;
    }
    const item = current.current ?? { key: crypto.randomUUID(), body };
    current.current = item;
    setPending(item);
    setBusy(true);
    setNote(pending ? "Checking before retry…" : "Sending one request…");
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
        body: JSON.stringify({ peer: peerId, ...item }),
      });
      const data = (await response.json()) as { kind: string };
      if (now !== ticket.current || document.hidden) return;
      if (data.kind === "ok") {
        if (firstRequestConfirmed(!!pending, data.kind))
          void analytics.capture("dm_request_sent");
        current.current = null;
        setPending(null);
        setDraft("");
        setSent(true);
        onSent();
        setNote("Request sent. They can accept, reply or ignore it.");
      } else if (data.kind === "denied") {
        hide();
        setNote(
          "Request unavailable. This person or your access may have changed.",
        );
      } else if (data.kind === "conflict")
        setNote(
          "This retry differs from the original request. Reload before another action.",
        );
      else
        setNote(
          "Outcome uncertain. Retry the exact same message after a fresh eligibility check.",
        );
    } catch {
      if (now === ticket.current)
        setNote(
          "Outcome uncertain. Retry the exact same message after a fresh eligibility check.",
        );
    } finally {
      if (now === ticket.current) setBusy(false);
    }
  }
  const viewState =
    masked || state === "unknown"
      ? "unknown"
      : state === "accepted"
        ? "accepted"
        : sent
          ? "pending"
          : state;
  return (
    <section
      className="people-preview dm-request"
      aria-labelledby="request-heading"
    >
      <h2 id="request-heading" tabIndex={-1}>
        Say hello
      </h2>
      <p>
        {viewState === "accepted"
          ? "Your conversation is ready. Current access is checked when you open it."
          : viewState === "pending"
            ? "A first-message request is active. Open it to see its current status and available actions."
            : viewState === "unknown"
              ? "We couldn’t confirm the current request status. Reload before starting a new message."
              : "One first message goes to their Requests. You cannot keep chatting unless they accept or reply. They can ignore it."}
      </p>
      {viewState === "accepted" || viewState === "pending" ? (
        <Link href={`/chats/direct/${peerId}`}>
          {viewState === "accepted" ? "Open chat" : "Check request"}
        </Link>
      ) : viewState === "unknown" ? (
        <a href={`/people/${peerId}`}>Reload to check status</a>
      ) : masked ? (
        <p>Reload this profile to check current People access.</p>
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
          <p className="help">Plain text · 1–2000 characters</p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void send()}
          >
            {pending ? "Retry same request" : "Send request"}
          </button>
        </>
      )}
      <p role="status">{note}</p>
    </section>
  );
}

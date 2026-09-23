"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DmInboxRow } from "../../lib/dm";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  authTransitionDecision,
  type AuthTransitionMessage,
} from "../auth-transition";
import { createDmAuthVerifier } from "./dm-auth-verifier";
export function DmInbox({ actor }: { actor: string }) {
  const [rows, setRows] = useState<DmInboxRow[]>([]),
    [phase, setPhase] = useState<"loading" | "ready" | "denied" | "error">(
      "loading",
    ),
    [more, setMore] = useState(false);
  const [note, setNote] = useState("");
  const cursor = useRef<{ time: string; generation: string } | null>(null),
    request = useRef(0),
    pendingTransitions = useRef(new Set<string>()),
    settledTransitions = useRef(new Map<string, "settled" | "cancelled">()),
    denied = useRef(false);
  const mask = useCallback(() => {
    request.current++;
    setRows([]);
    setMore(false);
    setPhase("loading");
    setNote("Checking Requests and direct chats…");
  }, []);
  const deny = useCallback(() => {
    denied.current = true;
    pendingTransitions.current.clear();
    settledTransitions.current.clear();
    mask();
    setPhase("denied");
    setNote("Direct chats are unavailable. Your access may have changed.");
  }, [mask]);
  const read = useCallback(
    async (next: { time: string; generation: string } | null = null) => {
      if (document.hidden || pendingTransitions.current.size || denied.current)
        return;
      const now = ++request.current;
      setPhase("loading");
      setRows([]);
      const query = next
        ? `?time=${encodeURIComponent(next.time)}&generation=${next.generation}`
        : "";
      try {
        const response = await fetch(`/api/dm${query}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "x-pals-dm-actor": actor },
        });
        const data = (await response.json()) as {
          kind: string;
          rows?: DmInboxRow[];
        };
        if (
          now !== request.current ||
          document.hidden ||
          pendingTransitions.current.size ||
          denied.current
        )
          return;
        if (response.status === 403) {
          deny();
          return;
        }
        if (data.kind !== "ok") {
          setPhase("error");
          setNote("Could not load direct chats. Try again.");
          return;
        }
        cursor.current = next;
        setRows(data.rows ?? []);
        setMore((data.rows?.length ?? 0) === 24);
        setPhase("ready");
        setNote("");
      } catch {
        if (
          now === request.current &&
          !document.hidden &&
          !pendingTransitions.current.size &&
          !denied.current
        ) {
          setPhase("error");
          setNote("Connection interrupted. Try again.");
        }
      }
    },
    [actor, deny],
  );
  useEffect(() => {
    const verify = createDmAuthVerifier({
      pending: pendingTransitions.current,
      settled: settledTransitions.current,
      revision: () => request.current,
      active: (startedAt) =>
        startedAt === request.current && !document.hidden && !denied.current,
      probe: async () => {
        const response = await fetch("/api/dm", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "x-pals-dm-actor": actor },
        });
        // This is an account probe. Never put its inbox bodies in UI state.
        return response.status;
      },
      deny,
      reauthorize: () => resume(),
    });
    const resume = () => {
      if (document.hidden || denied.current) return;
      mask();
      if (pendingTransitions.current.size) {
        for (const [token, phase] of settledTransitions.current)
          void verify({ token, phase });
      } else void read(null);
    };
    const visibility = () => {
      if (document.hidden) mask();
      else resume();
    };
    const transition = (event: AuthTransitionMessage) => {
      if (denied.current) return;
      const decision = authTransitionDecision(
        pendingTransitions.current,
        event,
      );
      if (decision === "mask") mask();
      else if (
        decision === "verify" &&
        "token" in event &&
        event.phase !== "begin"
      ) {
        mask();
        settledTransitions.current.set(event.token, event.phase);
        void verify(event);
      } else if (decision === "reauthorize") resume();
    };
    const local = (event: Event) =>
      transition((event as CustomEvent<AuthTransitionMessage>).detail);
    resume();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", mask);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    window.addEventListener(AUTH_TRANSITION_EVENT, local);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
      transition(event.data);
    const storage = (event: StorageEvent) => {
      if (event.key?.includes("auth-token")) resume();
    };
    window.addEventListener("storage", storage);
    return () => {
      mask();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", mask);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener(AUTH_TRANSITION_EVENT, local);
      window.removeEventListener("storage", storage);
      channel.close();
    };
  }, [actor, deny, mask, read]);
  const requests = rows.filter((row) => row.state === "pending"),
    direct = rows.filter((row) => row.state === "accepted");
  const entry = (row: DmInboxRow) => (
    <li key={row.generation_id}>
      <div>
        <strong>Person unavailable</strong>
        <code className="dm-id">{row.peer_id}</code>
        <small>{new Date(row.created_at).toLocaleString()}</small>
        {row.state === "pending" && row.direction === "outgoing" && (
          <span>Waiting for their choice</span>
        )}
        {row.state === "pending" &&
          row.direction === "incoming" &&
          row.first_body !== null && (
            <p className="dm-preview">{row.first_body}</p>
          )}
        {row.state === "pending" &&
          row.direction === "incoming" &&
          row.first_body === null && <span>Message access paused</span>}
      </div>
      <Link href={`/chats/direct/${row.peer_id}`}>
        {row.state === "accepted" ? "Open chat" : "Manage request"}
      </Link>
    </li>
  );
  return (
    <div className="dm-inbox" aria-live="polite">
      <section aria-labelledby="requests-title">
        <h2 id="requests-title">Requests</h2>
        <p>First messages wait here until you accept or reply.</p>
        {phase === "ready" &&
          (requests.length ? (
            <ul className="chat-list">{requests.map(entry)}</ul>
          ) : (
            <p>No current requests.</p>
          ))}
      </section>
      <section aria-labelledby="direct-title">
        <h2 id="direct-title">Direct chats</h2>
        <p>Conversations you have accepted or replied to.</p>
        {phase === "ready" &&
          (direct.length ? (
            <ul className="chat-list">{direct.map(entry)}</ul>
          ) : (
            <p>No direct chats yet.</p>
          ))}
      </section>
      {phase === "loading" && <p role="status">Checking direct chats…</p>}
      {(phase === "error" || phase === "denied") && (
        <div role="alert">
          <p>{note}</p>
          {phase === "error" && (
            <button
              className="quiet-button"
              onClick={() => void read(cursor.current)}
            >
              Try again
            </button>
          )}
        </div>
      )}
      {phase === "ready" && more && (
        <button
          className="quiet-button"
          onClick={() => {
            const last = rows.at(-1);
            if (last)
              void read({
                time: last.created_at,
                generation: last.generation_id,
              });
          }}
        >
          Load more direct chats
        </button>
      )}
    </div>
  );
}

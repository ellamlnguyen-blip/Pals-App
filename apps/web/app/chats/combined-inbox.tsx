"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CombinedRow } from "./combined-types";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  authTransitionDecision,
  type AuthTransitionMessage,
} from "../auth-transition";
import { peerPhotoUrl } from "../people/[id]/peer-photo";
import { createDmAuthVerifier } from "./dm-auth-verifier";

type InboxResponse = {
  kind: string;
  source?: string;
  rows?: CombinedRow[];
  next?: string | null;
};

function PeerAvatar({ row }: { row: Extract<CombinedRow, { kind: "dm" }> }) {
  const [failed, setFailed] = useState(false);
  const initials = row.name
    ?.trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();
  return (
    <span className="combined-avatar" aria-hidden="true">
      {row.name && row.photoRevision && !failed ? (
        <Image
          src={peerPhotoUrl(row.dm.peer_id, "primary", row.photoRevision)}
          alt=""
          width={52}
          height={52}
          unoptimized
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials || "?"}</span>
      )}
    </span>
  );
}

export function CombinedInbox({
  actor,
  selected,
  initialCategory,
}: {
  actor: string;
  selected?: { kind: "hangout" | "dm"; id: string };
  initialCategory?: "hangout" | "dm";
}) {
  const [category, setCategory] = useState<"hangout" | "dm">(
    selected?.kind ?? initialCategory ?? "hangout",
  );
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "denied" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const attemptedCursor = useRef<string | null>(null);
  const attemptedIndex = useRef(0);
  const cursors = useRef<(string | null)[]>([null]);
  const request = useRef(0);
  const pendingTransitions = useRef(new Set<string>());
  const settledTransitions = useRef(new Map<string, "settled" | "cancelled">());
  const denied = useRef(false);
  const mask = useCallback(() => {
    request.current++;
    setRows([]);
    setNext(null);
    setPhase("loading");
    setMessage("Checking chats…");
  }, []);
  const deny = useCallback(() => {
    denied.current = true;
    pendingTransitions.current.clear();
    settledTransitions.current.clear();
    mask();
    setPhase("denied");
    setMessage("Chats are unavailable. Your access may have changed.");
  }, [mask]);
  const read = useCallback(
    async (page: string | null = null, index = 0, refreshes = 0) => {
      if (document.hidden || pendingTransitions.current.size || denied.current)
        return;
      attemptedCursor.current = page;
      attemptedIndex.current = index;
      const now = ++request.current;
      setRows([]);
      setPhase("loading");
      const query = new URLSearchParams({ category });
      if (page) query.set("cursor", page);
      try {
        const response = await fetch(`/api/chats?${query}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "x-pals-chat-actor": actor },
        });
        const data = (await response.json()) as InboxResponse;
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
        if (data.kind === "stale") {
          cursors.current = [null];
          if (refreshes < 1) {
            void read(null, 0, refreshes + 1);
            return;
          }
        }
        if (!response.ok || data.kind !== "ok") {
          setPhase("error");
          setMessage(
            data.source
              ? `Could not load ${data.source}. Try again.`
              : "Could not load chats. Try again.",
          );
          return;
        }
        setRows(data.rows ?? []);
        setNext(data.next ?? null);
        setPageIndex(index);
        cursors.current = [...cursors.current.slice(0, index), page];
        setPhase("ready");
        setMessage("");
      } catch {
        if (
          now === request.current &&
          !document.hidden &&
          !pendingTransitions.current.size &&
          !denied.current
        ) {
          setPhase("error");
          setMessage("Connection interrupted. Try again.");
        }
      }
    },
    [actor, category, deny],
  );
  useEffect(() => {
    const resume = () => {
      if (document.hidden || denied.current) return;
      mask();
      cursors.current = [null];
      if (pendingTransitions.current.size) {
        for (const [token, phase] of settledTransitions.current)
          void verify({ token, phase });
      } else void read(null);
    };
    const verify = createDmAuthVerifier({
      pending: pendingTransitions.current,
      settled: settledTransitions.current,
      revision: () => request.current,
      active: (startedAt) =>
        startedAt === request.current && !document.hidden && !denied.current,
      probe: async () => {
        const response = await fetch("/api/chats", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "x-pals-chat-actor": actor },
        });
        // An account probe never places inbox content in state.
        return response.status;
      },
      deny,
      reauthorize: resume,
    });
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
  const switchCategory = (value: "hangout" | "dm") => {
    if (value === category) return;
    mask();
    cursors.current = [null];
    setPageIndex(0);
    setCategory(value);
  };
  const requestCount = rows.filter(
    (row) =>
      row.kind === "dm" &&
      row.dm.state === "pending" &&
      row.dm.direction === "incoming",
  ).length;
  return (
    <div className="combined-inbox" aria-live="polite">
      <div
        className="chat-category-tabs"
        role="group"
        aria-label="Conversation category"
      >
        <button
          type="button"
          aria-pressed={category === "hangout"}
          onClick={() => switchCategory("hangout")}
        >
          Hangouts
        </button>
        <button
          type="button"
          aria-pressed={category === "dm"}
          onClick={() => switchCategory("dm")}
        >
          Messages
        </button>
      </div>
      <button
        className="chat-request-cue"
        type="button"
        onClick={() => switchCategory("dm")}
      >
        Message requests
        {category === "dm" && phase === "ready" && requestCount > 0 && (
          <span>{requestCount} on this page</span>
        )}
      </button>
      {phase === "loading" && <p role="status">Checking chats…</p>}
      {(phase === "error" || phase === "denied") && (
        <div role="alert">
          <p>{message}</p>
          {phase === "error" && (
            <button
              className="quiet-button"
              onClick={() =>
                void read(attemptedCursor.current, attemptedIndex.current)
              }
            >
              Try again
            </button>
          )}
        </div>
      )}
      {phase === "ready" &&
        (rows.length ? (
          <ul className="combined-list">
            {rows.map((row) => {
              if (row.kind === "hangout")
                return (
                  <li key={`h-${row.id}`}>
                    <Link
                      href={`/chats/hangouts/${row.id}`}
                      prefetch={false}
                      className={
                        selected?.kind === "hangout" && selected.id === row.id
                          ? "is-selected"
                          : undefined
                      }
                      aria-current={
                        selected?.kind === "hangout" && selected.id === row.id
                          ? "page"
                          : undefined
                      }
                    >
                      <span
                        className="combined-avatar combined-emoji"
                        aria-hidden="true"
                      >
                        {row.emoji}
                      </span>
                      <span className="combined-copy">
                        <strong>{row.title}</strong>
                        <small>Hangout</small>
                      </span>
                      {row.hasUnread && (
                        <span
                          className="combined-unread"
                          role="img"
                          aria-label="Unread messages"
                        />
                      )}
                      <span className="combined-arrow" aria-hidden="true">
                        ›
                      </span>
                    </Link>
                  </li>
                );
              const { dm } = row;
              const description =
                dm.state === "accepted"
                  ? "Direct chat"
                  : dm.direction === "incoming"
                    ? "Message request · review before replying"
                    : "Message request · waiting for their choice";
              return (
                <li key={`d-${dm.generation_id}`}>
                  <Link
                    href={`/chats/direct/${dm.peer_id}`}
                    prefetch={false}
                    className={
                      selected?.kind === "dm" && selected.id === dm.peer_id
                        ? "is-selected"
                        : undefined
                    }
                    aria-current={
                      selected?.kind === "dm" && selected.id === dm.peer_id
                        ? "page"
                        : undefined
                    }
                  >
                    <PeerAvatar row={row} />
                    <span className="combined-copy">
                      <strong>{row.name || "Person unavailable"}</strong>
                      <small>{description}</small>
                    </span>
                    {row.hasUnread && (
                      <span
                        className="combined-unread"
                        role="img"
                        aria-label="Unread messages"
                      />
                    )}
                    <span className="combined-arrow" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="chat-empty">
            <h2>
              {pageIndex === 0 && !next
                ? category === "hangout"
                  ? "No Hangout chats yet"
                  : "No messages yet"
                : `No ${category === "hangout" ? "Hangout chats" : "messages"} on this page`}
            </h2>
            <p>
              {next
                ? "There are more conversations to check. Continue to the next page."
                : category === "hangout"
                  ? "Join a Hangout to coordinate a plan."
                  : "Start a direct conversation to make a plan together."}
            </p>
            <Link href={category === "hangout" ? "/hangouts/saved" : "/people"}>
              {category === "hangout" ? "Find Hangouts" : "Find people"}
            </Link>
          </div>
        ))}
      {phase === "ready" && (pageIndex > 0 || next) && (
        <nav className="combined-pages" aria-label="Chat pages">
          {pageIndex > 0 && (
            <button
              className="quiet-button"
              onClick={() =>
                void read(cursors.current[pageIndex - 1], pageIndex - 1)
              }
            >
              Previous page
            </button>
          )}
          {pageIndex > 0 && (
            <button className="quiet-button" onClick={() => void read(null, 0)}>
              Start over
            </button>
          )}
          {next && (
            <button
              className="quiet-button"
              onClick={() => void read(next, pageIndex + 1)}
            >
              Next page
            </button>
          )}
        </nav>
      )}
    </div>
  );
}

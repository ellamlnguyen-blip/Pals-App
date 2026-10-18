"use client";

import { useEffect, useRef, useState } from "react";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
} from "../../auth-transition";
import { FriendControl } from "../friend-control";
import type { Friendship } from "../friend-actions";
import { readHiddenFriendships } from "./hidden-friendships-actions";

export function HiddenFriendships({ actor }: { actor: string }) {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<Friendship[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const epoch = useRef(0);

  const clear = () => {
    epoch.current++;
    setRows([]);
    setNext(null);
    setPhase("idle");
    setExpanded(false);
  };
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("pagehide", clear);
    window.addEventListener(AUTH_TRANSITION_EVENT, clear);
    document.addEventListener("visibilitychange", visibility);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
      channel.onmessage = clear;
    } catch {
      /* Local transitions and visibility still conceal this section. */
    }
    return () => {
      window.removeEventListener("pagehide", clear);
      window.removeEventListener(AUTH_TRANSITION_EVENT, clear);
      document.removeEventListener("visibilitychange", visibility);
      channel?.close();
    };
  }, []);

  async function load(after: string | null) {
    const started = ++epoch.current;
    setRows([]);
    setNext(null);
    setPhase("loading");
    const result = await readHiddenFriendships(after);
    if (started !== epoch.current || document.hidden) return;
    if (result.kind !== "ok") {
      setPhase("error");
      return;
    }
    setRows(result.rows);
    setNext(result.next);
    setPhase("ready");
  }

  return (
    <section id="relationships" className="profile-relationship-management">
      <button
        type="button"
        className="profile-relationship-toggle"
        aria-expanded={expanded}
        aria-controls="hidden-relationships"
        onClick={() => {
          if (expanded) clear();
          else {
            setExpanded(true);
            void load(null);
          }
        }}
      >
        Manage unavailable Pals and requests
      </button>
      {expanded && (
        <div id="hidden-relationships">
          <p>
            Relationships whose profiles are currently unavailable appear by
            account ID. You can manage your own requests and friendships here.
          </p>
          {phase === "loading" && <p role="status">Checking relationships…</p>}
          {phase === "error" && (
            <div role="alert">
              <p>
                Couldn’t confirm current relationships. Reload to try again.
              </p>
              <button type="button" onClick={() => void load(null)}>
                Retry
              </button>
            </div>
          )}
          {phase === "ready" && (
            <>
              {rows.length ? (
                <ul className="profile-hidden-relationships">
                  {rows.map((row) => (
                    <li key={row.peer_id}>
                      <p>
                        <strong>Profile unavailable</strong> · Account ID:{" "}
                        <code>{row.peer_id}</code>
                      </p>
                      <FriendControl
                        peerId={row.peer_id}
                        initial={{
                          state: "known",
                          relationship: row,
                          message:
                            "Current owner relationship from this page load.",
                        }}
                        canRequest={false}
                        canBlock
                        actor={actor}
                        peerLabel="this account"
                        onClear={() => {
                          setRows([]);
                          setNext(null);
                          setPhase("error");
                        }}
                        onRelationshipChange={(relationship) =>
                          setRows((current) =>
                            relationship
                              ? current.map((item) =>
                                  item.peer_id === row.peer_id
                                    ? relationship
                                    : item,
                                )
                              : current.filter(
                                  (item) => item.peer_id !== row.peer_id,
                                ),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No unavailable relationships on this page.</p>
              )}
              {next && (
                <button type="button" onClick={() => void load(next)}>
                  Next relationship page
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

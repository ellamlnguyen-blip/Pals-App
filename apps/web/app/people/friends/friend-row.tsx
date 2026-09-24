"use client";
import { useEffect, useState } from "react";
import { FriendControl } from "../friend-control";
import type { Friendship } from "../friend-actions";

export function FriendRow({
  row,
  name,
  canBlock,
  actor,
}: {
  row: Friendship;
  name: string | null;
  canBlock: boolean;
  actor: string;
}) {
  const [visibleName, setVisibleName] = useState(name);
  useEffect(() => {
    const clear = () => setVisibleName(null);
    window.addEventListener("pagehide", clear);
    return () => window.removeEventListener("pagehide", clear);
  }, []);
  return (
    <li>
      <div>
        <h2>{visibleName ?? "Person unavailable in People"}</h2>
        <p className="friend-id">
          Account ID: <code>{row.peer_id}</code>
        </p>
        <p>
          {row.state === "accepted"
            ? "Friends"
            : row.direction === "incoming"
              ? "Incoming request"
              : "Outgoing request"}
        </p>
        {visibleName && (
          <a href={`/people/${row.peer_id}?from=%2Fpeople`}>
            View current People profile
          </a>
        )}
      </div>
      <FriendControl
        peerId={row.peer_id}
        initial={{
          state: "known",
          relationship: row,
          message: "Current owner relationship from this page load.",
        }}
        canRequest={false}
        canBlock={canBlock}
        actor={actor}
        peerLabel={visibleName ?? "this account ID"}
        onClear={() => setVisibleName(null)}
      />
    </li>
  );
}

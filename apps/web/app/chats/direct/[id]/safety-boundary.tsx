"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useState } from "react";
import { SafetyActions } from "../../../safety/safety-client";
import { peerPhotoUrl } from "../../../people/[id]/peer-photo";
import { DirectThread } from "./thread";

type PeerIdentity = { name: string; photoRevision: number | null };

export function DirectSafetyBoundary({
  id,
  actor,
}: {
  id: string;
  actor: string;
}) {
  const [cleared, setCleared] = useState(false);
  const [peer, setPeer] = useState<PeerIdentity | null>(null);
  const updatePeer = useCallback(
    (next: PeerIdentity | null) => setPeer(next),
    [],
  );
  return (
    <>
      <header className="chat-detail-header">
        <Link className="chat-back" href="/chats?category=dm">
          ← All chats
        </Link>
        <div className="chat-detail-identity">
          <span className="combined-avatar" aria-hidden="true">
            {peer?.photoRevision ? (
              <Image
                src={peerPhotoUrl(id, "primary", peer.photoRevision)}
                alt=""
                width={52}
                height={52}
                unoptimized
              />
            ) : peer ? (
              peer.name
                .trim()
                .split(/\s+/u)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toLocaleUpperCase()
            ) : (
              "✉"
            )}
          </span>
          <div>
            <h2 id="direct-title">{peer?.name || "Direct chat"}</h2>
          </div>
        </div>
      </header>
      {cleared ? (
        <div role="status">
          <p>Direct chat access changed. Check the latest state in Safety.</p>
          <Link href="/safety">Open Safety</Link>
        </div>
      ) : (
        <DirectThread id={id} actor={actor} onIdentityChange={updatePeer} />
      )}
      <SafetyActions
        actor={actor}
        target={{ mode: "user", id }}
        allowBlock
        onBlockConfirmed={() => {
          setPeer(null);
          setCleared(true);
        }}
      />
    </>
  );
}

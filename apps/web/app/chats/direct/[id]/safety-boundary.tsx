"use client";
import Link from "next/link";
import { useState } from "react";
import { SafetyActions } from "../../../safety/safety-client";
import { DirectThread } from "./thread";

export function DirectSafetyBoundary({
  id,
  actor,
  knownPair,
}: {
  id: string;
  actor: string;
  knownPair: boolean;
}) {
  const [cleared, setCleared] = useState(false);
  return (
    <>
      {cleared ? (
        <div role="status">
          <p>Direct chat access changed. Check the latest state in Safety.</p>
          <Link href="/safety">Open Safety</Link>
        </div>
      ) : (
        <DirectThread id={id} actor={actor} />
      )}
      {knownPair && (
        <SafetyActions
          actor={actor}
          target={{ mode: "user", id }}
          allowBlock
          onBlockConfirmed={() => setCleared(true)}
        />
      )}
    </>
  );
}

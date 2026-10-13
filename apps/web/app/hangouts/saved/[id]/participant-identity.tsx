"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { RosterIdentity } from "./roster-identities";

export function ParticipantIdentity({
  accountId,
  actorId,
  hangoutId,
  role,
  identity,
  compact = false,
}: {
  accountId: string;
  actorId: string;
  hangoutId: string;
  role: "host" | "cohost" | "participant";
  identity?: RosterIdentity;
  compact?: boolean;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const own = accountId === actorId;
  const current = photoFailed ? undefined : identity;
  const name = own ? "You" : (current?.name ?? "Pal");
  const label =
    role === "host" ? "Host" : role === "cohost" ? "Co-host" : "Attendee";
  const href = own
    ? "/profile"
    : current
      ? `/people/${accountId}?from=${encodeURIComponent(`/hangouts/saved/${hangoutId}`)}`
      : null;
  const avatar = (
    <span
      className={`pals-detail-avatar pals-detail-avatar-${role}`}
      aria-hidden="true"
    >
      {!own && current?.photoRevision ? (
        <Image
          src={`/people/${accountId}/photo?slot=primary&revision=${current.photoRevision}`}
          alt=""
          width={64}
          height={64}
          unoptimized
          onError={() => setPhotoFailed(true)}
        />
      ) : own ? (
        "You"
      ) : role === "participant" ? (
        "Pal"
      ) : role === "cohost" ? (
        "Co"
      ) : (
        "Host"
      )}
    </span>
  );
  const content = compact ? (
    avatar
  ) : (
    <>
      {avatar}
      <span className="pals-detail-person-copy">
        <strong>{name}</strong>
        <small>{label}</small>
      </span>
    </>
  );
  const className = compact
    ? "pals-detail-person pals-detail-person-compact"
    : "pals-detail-person";
  return href ? (
    <Link
      className={className}
      href={href}
      aria-label={compact ? `View ${name} profile, ${label}` : undefined}
    >
      {content}
    </Link>
  ) : (
    <span
      className={className}
      aria-label={
        compact ? `${name}, ${label}; profile unavailable` : undefined
      }
    >
      {content}
    </span>
  );
}

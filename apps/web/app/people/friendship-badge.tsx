"use client";

import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { HeartIcon } from "@phosphor-icons/react/dist/csr/Heart";
import type { FriendshipBadgeStatus } from "./friendship-badge-state";

export function FriendshipBadge({ status }: { status: FriendshipBadgeStatus }) {
  if (!status) return null;
  return (
    <span
      className="people-friendship-badge"
      role="img"
      aria-label={
        status === "friend"
          ? "Current friend"
          : "Outgoing friend request pending"
      }
      title={
        status === "friend" ? "Current friend" : "Outgoing request pending"
      }
    >
      {status === "friend" ? (
        <HeartIcon size={20} weight="fill" aria-hidden="true" />
      ) : (
        <ClockIcon size={20} weight="bold" aria-hidden="true" />
      )}
    </span>
  );
}

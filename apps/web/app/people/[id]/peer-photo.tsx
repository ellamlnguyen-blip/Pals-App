"use client";

import Image from "next/image";
import type { RichPeopleDetail } from "@pals/types";

type PhotoSlot = RichPeopleDetail["photo_slots"][number];

export function peerPhotoUrl(
  subjectId: string,
  slot: PhotoSlot,
  revision: number,
) {
  return `/people/${subjectId}/photo?slot=${slot}&revision=${revision}`;
}

export function PeerPhoto({
  subjectId,
  slot,
  revision,
  label,
  onSelect,
  onUnavailable,
}: {
  subjectId: string;
  slot: PhotoSlot;
  revision: number;
  label: string;
  onSelect: (
    slot: PhotoSlot,
    label: string,
    trigger: HTMLButtonElement,
  ) => void;
  onUnavailable: () => void;
}) {
  return (
    <button
      className="profile-photo-trigger"
      type="button"
      aria-label={`View ${label}`}
      onClick={(event) => onSelect(slot, label, event.currentTarget)}
    >
      <Image
        src={peerPhotoUrl(subjectId, slot, revision)}
        alt={label}
        width={slot === "primary" ? 760 : 360}
        height={slot === "primary" ? 376 : 280}
        loading="lazy"
        unoptimized
        onError={onUnavailable}
      />
    </button>
  );
}

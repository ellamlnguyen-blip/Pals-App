"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useState } from "react";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
} from "../auth-transition";
import { peerPhotoUrl } from "./[id]/peer-photo";

const PhotoVisibility = createContext(true);

export function PeopleCardPhotoBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const conceal = () => setVisible(false);
    const onVisibility = () => {
      if (document.hidden) conceal();
    };
    window.addEventListener(AUTH_TRANSITION_EVENT, conceal);
    window.addEventListener("pagehide", conceal);
    document.addEventListener("visibilitychange", onVisibility);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = conceal;
    return () => {
      window.removeEventListener(AUTH_TRANSITION_EVENT, conceal);
      window.removeEventListener("pagehide", conceal);
      document.removeEventListener("visibilitychange", onVisibility);
      channel.close();
    };
  }, []);
  return (
    <PhotoVisibility.Provider value={visible}>
      {children}
    </PhotoVisibility.Provider>
  );
}

export function PeopleCardPhoto({
  subjectId,
  name,
  revision,
}: {
  subjectId: string;
  name: string;
  revision: number | null;
}) {
  const visible = useContext(PhotoVisibility);
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase();
  return (
    <span className="people-card-photo" aria-hidden="true">
      {visible && revision !== null && !failed ? (
        <Image
          src={peerPhotoUrl(subjectId, "primary", revision)}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="people-card-photo-fallback">{initials || "?"}</span>
      )}
    </span>
  );
}

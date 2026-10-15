"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, EnvelopeSimple } from "@phosphor-icons/react";
import { SignOutForm } from "./auth-change-signal";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "./auth-transition";

export type StudentDestinations = {
  calendar: boolean;
  people: boolean;
  chats: boolean;
  notifications: boolean;
};

const destinations = [
  { label: "Hangouts", href: "/hangouts", key: "hangouts" },
  { label: "Calendar", href: "/calendar", key: "calendar" },
  { label: "People", href: "/people", key: "people" },
] as const;
export const NOTIFICATION_ATTENTION_CHANNEL = "pals-notification-attention";
export const NOTIFICATION_OPEN_EVENT = "pals-notification-open";

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand-link" href={href} aria-label="Pals home">
      <Image
        src="/brand/pals-logo.png"
        alt="Pals"
        width={76}
        height={70}
        priority
      />
    </Link>
  );
}

export function StudentHeader({
  signedIn = false,
  name,
  accountReady = false,
  ownerPhotoRevision,
  available,
  actor,
}: {
  signedIn?: boolean;
  name?: string | null;
  accountReady?: boolean;
  ownerPhotoRevision?: number | null;
  attendanceAvailable?: boolean;
  available?: StudentDestinations;
  actor?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [photoRefresh, setPhotoRefresh] = useState(0);
  const [concealed, setConcealed] = useState(false);
  const [unread, setUnread] = useState<boolean | null>(null);
  const attentionRevision = useRef(0);
  const accountRef = useRef<HTMLDivElement>(null);
  const concealedRef = useRef(false);
  const authPending = useRef(new Set<string>());
  const refreshAttention = useCallback(async () => {
    if (!actor || !available?.notifications || concealedRef.current || document.hidden) return;
    const started = ++attentionRevision.current;
    try {
      const response = await fetch("/api/notifications?summary=1", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { "x-pals-notification-actor": actor },
      });
      if (started !== attentionRevision.current || concealedRef.current || document.hidden) return;
      if (response.status === 403) {
        setUnread(null);
        return;
      }
      const body = await response.json();
      if (response.ok && body.kind === "ok" && body.actor === actor && typeof body.unread === "boolean")
        setUnread(body.unread);
    } catch {
      // Preserve the last confirmed value until a fresh owner check succeeds.
    }
  }, [actor, available?.notifications]);
  useEffect(() => {
    if (!actor || !available?.notifications) return;
    const revisionRef = attentionRevision;
    const initial = window.setTimeout(() => void refreshAttention(), 0);
    const timer = window.setInterval(() => void refreshAttention(), 30000);
    const focus = () => void refreshAttention();
    const channel = new BroadcastChannel(NOTIFICATION_ATTENTION_CHANNEL);
    channel.onmessage = focus;
    window.addEventListener(NOTIFICATION_ATTENTION_CHANNEL, focus);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      revisionRef.current++;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener(NOTIFICATION_ATTENTION_CHANNEL, focus);
      document.removeEventListener("visibilitychange", focus);
      channel.close();
    };
  }, [actor, available?.notifications, pathname, refreshAttention]);
  useEffect(() => {
    const channel = new BroadcastChannel("pals-photo-invalidated");
    const refresh = () => {
      if (concealedRef.current || authPending.current.size || document.hidden)
        return;
      setPhotoRefresh((value) => value + 1);
      router.refresh();
    };
    channel.addEventListener("message", refresh);
    window.addEventListener("pals-photo-invalidated", refresh);
    return () => {
      channel.removeEventListener("message", refresh);
      channel.close();
      window.removeEventListener("pals-photo-invalidated", refresh);
    };
  }, [router]);
  useEffect(() => {
    const conceal = () => {
      concealedRef.current = true;
      attentionRevision.current++;
      setUnread(null);
      if (accountRef.current) accountRef.current.style.display = "none";
      setConcealed(true);
    };
    const auth = (message: AuthTransitionMessage) => {
      conceal();
      if (message.phase === "begin") authPending.current.add(message.token);
      else if (message.phase !== "revalidate")
        authPending.current.delete(message.token);
      if (
        !document.hidden &&
        !authPending.current.size &&
        message.phase !== "begin"
      )
        window.location.reload();
    };
    const localAuth = (event: Event) =>
      auth((event as CustomEvent<AuthTransitionMessage>).detail);
    const visibility = () => {
      if (document.hidden) conceal();
      else if (concealedRef.current && !authPending.current.size)
        window.location.reload();
    };
    const pageshow = () => {
      if (concealedRef.current && !document.hidden && !authPending.current.size)
        window.location.reload();
    };
    window.addEventListener(AUTH_TRANSITION_EVENT, localAuth);
    window.addEventListener("pagehide", conceal);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
      channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
        auth(event.data);
    } catch {
      /* Local transitions and lifecycle still conceal account details. */
    }
    if (document.hidden) conceal();
    return () => {
      window.removeEventListener(AUTH_TRANSITION_EVENT, localAuth);
      window.removeEventListener("pagehide", conceal);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
      channel?.close();
    };
  }, []);
  return (
    <header
      className={`student-header${signedIn && !accountReady ? " student-header--limited" : ""}`}
    >
      <BrandLink href={accountReady ? "/hangouts" : "/"} />
      {available ? (
        <StudentNav available={available} />
      ) : (
        <span className="header-campus">UNC Chapel Hill</span>
      )}
      <div ref={accountRef} className="header-account" hidden={concealed}>
        {signedIn && !accountReady && (
          <Link className="header-safety" href="/safety">
            Safety
          </Link>
        )}
        {signedIn && !accountReady && <SignOutForm />}
        {available?.chats && (
          <Link className="header-icon-link" href="/chats" aria-label="Chats" aria-current={pathname?.startsWith("/chats") ? "page" : undefined}>
            <EnvelopeSimple size={25} weight="regular" aria-hidden="true" />
          </Link>
        )}
        {available?.notifications && (
          <Link className="header-icon-link header-notification-link" href="/notifications" aria-label={unread ? "Notifications, unread updates" : "Notifications"} aria-current={pathname?.startsWith("/notifications") ? "page" : undefined} onClick={(event) => {
            if (pathname === "/notifications") {
              event.preventDefault();
              window.dispatchEvent(new Event(NOTIFICATION_OPEN_EVENT));
            }
          }}>
            <Bell size={25} weight="regular" aria-hidden="true" />
            {unread && <span className="header-unread-dot" aria-hidden="true" />}
          </Link>
        )}
        {signedIn ? (
          <Link
            className="account-menu account-avatar-link"
            href="/profile"
            aria-label="Your profile"
          >
            <OwnerAvatar
              key={`${ownerPhotoRevision ?? "unknown"}:${photoRefresh}`}
              accountReady={accountReady}
              name={name}
              photoRevision={ownerPhotoRevision}
            />
          </Link>
        ) : (
          <Link className="header-signin" href="/signin">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function OwnerAvatar({
  accountReady,
  name,
  photoRevision,
}: {
  accountReady: boolean;
  name?: string | null;
  photoRevision?: number | null;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  // null means the owner profile has no photo. An omitted revision preserves
  // the existing best-effort avatar on routes that have not read that profile.
  return accountReady && photoRevision !== null && !photoFailed ? (
    <Image
      src={
        photoRevision === undefined
          ? "/profile/photo"
          : `/profile/photo?v=${photoRevision}`
      }
      alt=""
      width={40}
      height={40}
      unoptimized
      onError={() => setPhotoFailed(true)}
    />
  ) : (
    <span className="account-initial" aria-hidden="true">
      {name?.charAt(0).toUpperCase() || "P"}
    </span>
  );
}

export function StudentNav({
  available,
  onUnavailable,
}: {
  available: StudentDestinations;
  onUnavailable?: (name: string) => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="primary-nav" aria-label="Primary">
      {destinations.map(({ label, href, key }) => {
        const enabled = key === "hangouts" || available[key];
        return enabled ? (
          <Link
            href={href}
            key={key}
            aria-current={
              pathname === href || pathname.startsWith(`${href}/`)
                ? "page"
                : undefined
            }
          >
            {label}
          </Link>
        ) : onUnavailable ? (
          <button
            key={key}
            type="button"
            onClick={() => onUnavailable(label)}
            aria-label={`${label}, unavailable in this staging configuration`}
          >
            {label}
          </button>
        ) : (
          <span
            key={key}
            className="nav-unavailable"
            aria-label={`${label}, unavailable`}
          >
            {label}
          </span>
        );
      })}
    </nav>
  );
}

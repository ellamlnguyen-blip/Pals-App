"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SignOutForm } from "./auth-change-signal";

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
  { label: "Chats", href: "/chats", key: "chats" },
  { label: "Notifications", href: "/notifications", key: "notifications" },
] as const;

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
  attendanceAvailable = false,
  available,
}: {
  signedIn?: boolean;
  name?: string | null;
  accountReady?: boolean;
  attendanceAvailable?: boolean;
  available?: StudentDestinations;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);
  useEffect(() => {
    function dismiss(event: PointerEvent | KeyboardEvent) {
      if (!menu.current?.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      } else if (!menu.current.contains(event.target as Node))
        menu.current.open = false;
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, []);
  return (
    <header className="student-header">
      <BrandLink href={accountReady ? "/hangouts" : "/"} />
      {available ? (
        <StudentNav available={available} />
      ) : (
        <span className="header-campus">UNC Chapel Hill</span>
      )}
      <div className="header-account">
        {signedIn && (
          <Link className="header-safety" href="/safety">
            Safety
          </Link>
        )}
        {signedIn ? (
          <details className="account-menu" ref={menu}>
            <summary aria-label="Your account">
              {accountReady && !photoFailed ? (
                <Image
                  src="/profile/photo"
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
              )}
            </summary>
            <div className="account-panel">
              <strong>{name ?? "Your account"}</strong>
              <p>UNC Chapel Hill</p>
              {accountReady && <Link href="/profile">Your profile</Link>}
              <Link href="/safety">Safety</Link>
              <Link href="/account/analytics">Analytics choice</Link>
              {attendanceAvailable && (
                <Link href="/attendance">Your attendance</Link>
              )}
              <SignOutForm />
            </div>
          </details>
        ) : (
          <Link className="header-signin" href="/signin">
            Sign in
          </Link>
        )}
      </div>
    </header>
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

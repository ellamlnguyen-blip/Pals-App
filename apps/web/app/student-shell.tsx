"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
}: {
  signedIn?: boolean;
  name?: string | null;
  accountReady?: boolean;
  attendanceAvailable?: boolean;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <header className="student-header">
      <BrandLink href={accountReady ? "/hangouts" : "/"} />
      <span className="campus">UNC Chapel Hill</span>
      {signedIn && (
        <Link className="header-safety" href="/safety">
          Safety
        </Link>
      )}
      {signedIn ? (
        <details className="account-menu">
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
            aria-label={`${label}, coming later`}
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

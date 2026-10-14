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
  ownerPhotoRevision,
  available,
}: {
  signedIn?: boolean;
  name?: string | null;
  accountReady?: boolean;
  ownerPhotoRevision?: number | null;
  attendanceAvailable?: boolean;
  available?: StudentDestinations;
}) {
  return (
    <header className="student-header">
      <BrandLink href={accountReady ? "/hangouts" : "/"} />
      {available ? (
        <StudentNav available={available} />
      ) : (
        <span className="header-campus">UNC Chapel Hill</span>
      )}
      <div className="header-account">
        {signedIn && !accountReady && (
          <Link className="header-safety" href="/safety">
            Safety
          </Link>
        )}
        {signedIn && !accountReady && <SignOutForm />}
        {signedIn ? (
          <Link
            className="account-menu account-avatar-link"
            href="/profile"
            aria-label="Your profile"
          >
            <OwnerAvatar
              key={ownerPhotoRevision ?? "unknown"}
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

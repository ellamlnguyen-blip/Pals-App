"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ProfileOptions } from "./options-menu";
import type { StudentDestinations } from "../student-shell";
import { SignOutForm } from "../auth-change-signal";

export function ProfileTopbar({
  back,
  backLabel,
  children,
  available,
  attendanceAvailable,
  action,
}: {
  back: string;
  backLabel: string;
  children: ReactNode;
  available: StudentDestinations;
  attendanceAvailable: boolean;
  action?: ReactNode;
}) {
  return (
    <nav className="profile-topbar" aria-label="Profile controls">
      <a className="profile-back" href={back} aria-label={backLabel}>
        <ArrowLeftIcon size={25} weight="bold" aria-hidden="true" />
        <span>{backLabel.replace(/^Back to /, "")}</span>
      </a>
      <div className="profile-topbar-action">{action}</div>
      <ProfileOptions>
        <div className="profile-menu-links">
          <Link href="/profile">Your profile</Link>
          {available.people && (
            <Link href="/people/privacy">Profile sharing</Link>
          )}
          <Link href="/safety">Safety</Link>
          <Link href="/account/analytics">Analytics choice</Link>
          {attendanceAvailable && (
            <Link href="/attendance">Your attendance</Link>
          )}
          <SignOutForm />
        </div>
        {children}
      </ProfileOptions>
    </nav>
  );
}

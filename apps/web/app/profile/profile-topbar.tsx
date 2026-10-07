"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ProfileOptions } from "./options-menu";
import { StudentNav, type StudentDestinations } from "../student-shell";
import { SignOutForm } from "../auth-change-signal";

export function ProfileTopbar({
  back,
  backLabel,
  children,
  available,
  attendanceAvailable,
}: {
  back: string;
  backLabel: string;
  children: ReactNode;
  available: StudentDestinations;
  attendanceAvailable: boolean;
}) {
  return (
    <nav className="profile-topbar" aria-label="Profile controls">
      <a href={back} aria-label={backLabel}>
        <ArrowLeftIcon size={25} weight="bold" aria-hidden="true" />
      </a>
      <Link
        className="profile-topbar-brand"
        href="/hangouts"
        aria-label="Pals home"
      >
        Pals
      </Link>
      <ProfileOptions>
        <div className="profile-menu-links">
          <StudentNav available={available} />
          <Link href="/profile">Your profile</Link>
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

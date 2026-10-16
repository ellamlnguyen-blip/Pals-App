"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ProfileOptions } from "./options-menu";
import type { StudentDestinations } from "../student-shell";

export function ProfileTopbar({
  back,
  backLabel,
  children,
  available,
  action,
}: {
  back: string;
  backLabel: string;
  children?: ReactNode;
  available?: StudentDestinations;
  attendanceAvailable?: boolean;
  action?: ReactNode;
}) {
  return (
    <nav
      className={`profile-topbar${children ? "" : " profile-topbar--owner"}`}
      aria-label="Profile controls"
    >
      <a className="profile-back" href={back} aria-label={backLabel}>
        <ArrowLeftIcon size={25} weight="bold" aria-hidden="true" />
        <span>{backLabel.replace(/^Back to /, "")}</span>
      </a>
      <div className="profile-topbar-action">{action}</div>
      {children && (
        <ProfileOptions>
          {available?.people && (
            <div className="profile-menu-links">
              <Link href="/people/privacy">Profile sharing</Link>
            </div>
          )}
          {children}
        </ProfileOptions>
      )}
    </nav>
  );
}

import Image from "next/image";
import Link from "next/link";
import { requireAccess } from "../../lib/access";
import { SignOutForm } from "../auth-change-signal";
import { HangoutsShell } from "./shell";
import "./map.css";
import { localHangoutsAvailable } from "../../lib/hangouts";
import { localPeopleAvailable } from "../../lib/people";
import { OwnedHangouts } from "./owned-list";
import { localNotificationsAvailable } from "../../lib/notifications";

export default async function Hangouts() {
  const { client, user } = await requireAccess("ready");
  const localCreate = localHangoutsAvailable();
  const { data: profile } = await client
    .from("profiles")
    .select("real_name")
    .eq("user_id", user!.id)
    .single();
  return (
    <div className="hangouts-page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="hangouts-header">
        <Link className="wordmark" href="/hangouts">
          Pals
        </Link>
        <span className="campus">UNC Chapel Hill</span>
        <details className="account-menu">
          <summary aria-label="Your account">
            <Image
              src="/profile/photo"
              alt="Your profile photo"
              width={40}
              height={40}
              unoptimized
            />
          </summary>
          <div className="account-panel">
            <strong>{profile?.real_name ?? "Your account"}</strong>
            <p>UNC email verified</p>
            <Link href="/profile">Your profile</Link>
            <SignOutForm />
          </div>
        </details>
      </header>
      {localCreate && (
        <div className="saved-entry">
          <div>
            <strong>Saved Hangouts · local only</strong>
            <p>Explore real plans from ready UNC accounts on the campus map.</p>
          </div>
          <Link className="button" href="/hangouts/saved">
            Explore saved Hangouts
          </Link>
        </div>
      )}
      {localCreate && <OwnedHangouts />}
      <HangoutsShell
        createEnabled={localCreate}
        peopleEnabled={localPeopleAvailable()}
        notificationsEnabled={localNotificationsAvailable()}
        token={
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
            ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
            : ""
        }
      />
    </div>
  );
}

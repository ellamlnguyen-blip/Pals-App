import Image from "next/image";
import Link from "next/link";
import { requireAccess } from "../../lib/access";
import { signOut } from "../actions";
import { HangoutsShell } from "./shell";
import "./map.css";
import { localHangoutsAvailable } from "../../lib/hangouts";
import { localPeopleAvailable } from "../../lib/people";
import { OwnedHangouts } from "./owned-list";

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
            <form action={signOut}>
              <button className="text-button">Sign out</button>
            </form>
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
        token={
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
            ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
            : ""
        }
      />
    </div>
  );
}

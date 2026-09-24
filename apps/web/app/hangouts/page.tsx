import Link from "next/link";
import { requireAccess } from "../../lib/access";
import { StudentHeader } from "../student-shell";
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
      <StudentHeader signedIn accountReady name={profile?.real_name} />
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

import type { ReactNode } from "react";
import { localHangoutsAvailable } from "../lib/hangouts";
import { localAttendanceAvailable } from "../lib/attendance";
import { localPeopleAvailable } from "../lib/people";
import { localNotificationsAvailable } from "../lib/notifications";
import { StudentHeader } from "./student-shell";
import { access } from "../lib/access";
export function frameAvailableDestinations() {
  return {
    calendar: localHangoutsAvailable(),
    people: localPeopleAvailable(),
    chats: localHangoutsAvailable(),
    notifications: localNotificationsAvailable(),
  };
}
export async function Frame({
  children,
  signedIn = false,
  navigation = false,
  ownerPhotoRevision,
  profileChrome = false,
}: {
  children: ReactNode;
  signedIn?: boolean;
  navigation?: boolean;
  ownerPhotoRevision?: number | null;
  profileChrome?: boolean;
}) {
  // The attention request is bound to this freshly resolved server actor.
  let actor: string | undefined;
  if (navigation) {
    try {
      actor = (await access()).user?.id;
    } catch {
      // Keep the resolved page usable; the badge waits for a later navigation.
    }
  }
  return (
    <div className={profileChrome ? "page profile-frame" : "page"}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <StudentHeader
        key={actor ?? "no-actor"}
        signedIn={signedIn}
        accountReady={navigation}
        ownerPhotoRevision={ownerPhotoRevision}
        attendanceAvailable={signedIn && localAttendanceAvailable()}
        available={navigation ? frameAvailableDestinations() : undefined}
        actor={actor}
      />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
export function Intro({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="form-intro">
      <h1>{title}</h1>
      <p className="intro">{children}</p>
    </div>
  );
}

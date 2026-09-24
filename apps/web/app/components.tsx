import type { ReactNode } from "react";
import { localHangoutsAvailable } from "../lib/hangouts";
import { localPeopleAvailable } from "../lib/people";
import { localNotificationsAvailable } from "../lib/notifications";
import { StudentHeader, StudentNav } from "./student-shell";
export function Frame({
  children,
  signedIn = false,
  navigation = false,
}: {
  children: ReactNode;
  signedIn?: boolean;
  navigation?: boolean;
}) {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <StudentHeader signedIn={signedIn} accountReady={navigation} />
      {navigation && (
        <StudentNav
          available={{
            calendar: localHangoutsAvailable(),
            people: localPeopleAvailable(),
            chats: localHangoutsAvailable(),
            notifications: localNotificationsAvailable(),
          }}
        />
      )}
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

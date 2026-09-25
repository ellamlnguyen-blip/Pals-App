import Link from "next/link";
import { Frame } from "../components";
import { access } from "../../lib/access";
import { localAttendanceAvailable } from "../../lib/attendance";
import { AttendanceDashboard } from "./attendance-dashboard";
import "./attendance.css";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export default async function AttendancePage() {
  let account = null;
  try {
    account = localAttendanceAvailable() ? await access() : null;
  } catch {
    account = null;
  }
  if (!account?.user || ["signed_out", "restricted"].includes(account.state))
    return (
      <Frame>
        <section className="attendance-page">
          <h1>Attendance unavailable</h1>
          <p role="alert">Sign in with an active account to view attendance.</p>
          <Link href="/signin">Sign in</Link>
        </section>
      </Frame>
    );
  return (
    <Frame signedIn navigation={account.state === "ready"}>
      <AttendanceDashboard key={account.user.id} actor={account.user.id} />
    </Frame>
  );
}

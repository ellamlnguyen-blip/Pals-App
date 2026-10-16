import Link from "next/link";
import { notFound } from "next/navigation";
import { Frame } from "../../components";
import { access } from "../../../lib/access";
import { localNotificationsAvailable } from "../../../lib/notifications";
import { NotificationSettings } from "./settings";
import "../account.css";
import "../../notifications/notifications.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function NotificationSettingsPage() {
  if (!localNotificationsAvailable()) notFound();
  const account = await access();
  if (!account.user || ["signed_out", "restricted"].includes(account.state))
    return (
      <Frame>
        <main className="account-page">
          <h1>Settings unavailable</h1>
          <p>Sign in with an active account to manage notifications.</p>
          <Link href="/signin">Sign in</Link>
        </main>
      </Frame>
    );
  return (
    <Frame signedIn navigation={account.state === "ready"} profileChrome>
      <main className="account-page">
        <Link className="account-back" href="/account">
          ← Back to account
        </Link>
        <header className="account-heading">
          <h1>Notifications</h1>
          <p>Choose the Hangout activity you want to hear about.</p>
        </header>
        <NotificationSettings key={account.user.id} actor={account.user.id} />
      </main>
    </Frame>
  );
}

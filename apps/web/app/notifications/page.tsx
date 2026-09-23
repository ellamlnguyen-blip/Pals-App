import Link from "next/link";
import { notFound } from "next/navigation";
import { Frame } from "../components";
import { access } from "../../lib/access";
import { localNotificationsAvailable } from "../../lib/notifications";
import { NotificationsInbox } from "./notifications-inbox";
import "../hangouts/map.css";
import "./notifications.css";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export default async function NotificationsPage() {
  if (!localNotificationsAvailable()) notFound();
  let account;
  try {
    account = await access();
  } catch {
    account = null;
  }
  if (!account?.user || ["signed_out", "restricted"].includes(account.state))
    return (
      <Frame>
        <section className="notifications-page">
          <h1>Notifications unavailable</h1>
          <p role="alert">
            Sign in with an active account to check Notifications.
          </p>
          <Link href="/signin">Sign in</Link>
        </section>
      </Frame>
    );
  return (
    <Frame signedIn>
      <nav className="primary-nav" aria-label="Primary">
        <Link href="/hangouts">Hangouts</Link>
        <Link href="/calendar">Calendar</Link>
        <Link href="/people">People</Link>
        <Link href="/chats">Chats</Link>
        <Link href="/notifications" aria-current="page">
          Notifications
        </Link>
      </nav>
      <NotificationsInbox key={account.user.id} actor={account.user.id} />
    </Frame>
  );
}

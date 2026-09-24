import Link from "next/link";
import { Frame } from "../components";
import { access } from "../../lib/access";
import { localSafetyAvailable } from "../../lib/safety";
import { SafetyDashboard } from "./safety-client";
import "../hangouts/map.css";
import "./safety.css";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export default async function SafetyPage() {
  let account = null;
  try {
    account = localSafetyAvailable() ? await access() : null;
  } catch {
    account = null;
  }
  if (!account?.user || ["signed_out", "restricted"].includes(account.state))
    return (
      <Frame>
        <section className="safety-page">
          <h1>Safety unavailable</h1>
          <p role="alert">Sign in with an active account to use Safety.</p>
          <Link href="/signin">Sign in</Link>
        </section>
      </Frame>
    );
  return (
    <Frame signedIn>
      <SafetyDashboard key={account.user.id} actor={account.user.id} />
    </Frame>
  );
}

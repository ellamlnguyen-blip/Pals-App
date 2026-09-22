import Image from "next/image";
import Link from "next/link";
import { requireAccess } from "../../lib/access";
import { signOut } from "../actions";
import { HangoutsShell } from "./shell";
import "./map.css";

export default async function Hangouts() {
  const { client, user } = await requireAccess("ready");
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
      <HangoutsShell
        token={
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
            ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
            : ""
        }
      />
    </div>
  );
}

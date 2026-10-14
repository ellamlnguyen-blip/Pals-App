import Link from "next/link";
import { Frame } from "../components";
import { ownerProfile } from "../../lib/owner-profile";
import { AccountEditor } from "./editor";
import "./account.css";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, profile } = await ownerProfile();
  return (
    <Frame
      signedIn
      navigation
      profileChrome
      ownerPhotoRevision={profile.primary_photo_path ? profile.revision : null}
    >
      <div className="account-page">
        <Link className="account-back" href="/profile">
          ← Back to profile
        </Link>
        <header className="account-heading">
          <h1>Account</h1>
          <p>Keep your name and sign-in details up to date.</p>
        </header>
        <AccountEditor
          name={profile.real_name ?? ""}
          revision={profile.revision}
          currentEmail={user.email ?? ""}
          pendingEmail={user.new_email ?? null}
        />
      </div>
    </Frame>
  );
}

import Link from "next/link";
import { Frame } from "../components";
import { ownerProfile } from "../../lib/owner-profile";
import { ProfileEditor } from "./editor";
import type { OwnerProfile } from "@pals/types";
import "./profile.css";

export default async function ProfilePage() {
  const { user, profile } = await ownerProfile();
  return (
    <Frame signedIn>
      <div className="profile-heading">
        <Link href="/hangouts">← Back to Hangouts</Link>
        <h1>Your profile</h1>
        <p>Only you can see your profile and photos right now.</p>
      </div>
      <ProfileEditor
        profile={profile as OwnerProfile}
        email={user.email ?? ""}
      />
    </Frame>
  );
}

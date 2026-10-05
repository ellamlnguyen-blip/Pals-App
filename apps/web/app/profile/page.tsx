import Link from "next/link";
import { Frame } from "../components";
import { ownerProfile } from "../../lib/owner-profile";
import { localPeopleAvailable } from "../../lib/people";
import { ProfileEditor } from "./editor";
import type { OwnerProfile } from "@pals/types";
import "./profile.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile } = await ownerProfile();
  return (
    <Frame signedIn navigation>
      <div className="profile-heading">
        <Link href="/hangouts">← Back to Hangouts</Link>
        <h1>Your profile</h1>
        {!profile.is_complete && (
          <p>
            Your confirmed UNC email gives you access now. Add your profile
            details and a photo whenever you are ready.
          </p>
        )}
        <p>
          {localPeopleAvailable()
            ? "Your photos and extra details stay private. You may choose to share selected text in People."
            : "Only you can see your profile and photos right now."}
        </p>
        {localPeopleAvailable() && (
          <>
            <div className="profile-people-preview">
              <h2>Your People text preview</h2>
              <p>
                Only eligible students can see this after you turn sharing on
                and your real name, graduation year, major, and bio are usable.
                Opting in alone does not make an incomplete profile visible.
                Future edits to these fields are shared while your choice is on
                and your account remains eligible.
              </p>
              <dl>
                <dt>Card and detail</dt>
                <dd>Real name: {profile.real_name || "Not added"}</dd>
                <dd>Campus: University of North Carolina at Chapel Hill</dd>
                <dd>
                  Graduation year: {profile.graduation_year ?? "Not added"}
                </dd>
                <dd>Major: {profile.major || "Not added"}</dd>
                <dt>Detail only</dt>
                <dd>Bio: {profile.bio || "Not added"}</dd>
                <dd>
                  Interests: {profile.interests?.join(", ") || "Not added"}
                </dd>
                <dd>
                  Down to do: {profile.down_to_do?.join(", ") || "Not added"}
                </dd>
              </dl>
              <p>
                Your photos, email and all other profile fields stay private.
              </p>
            </div>
            <Link href="/people/privacy">
              Preview and manage People sharing
            </Link>
            <Link href="/people/friends">Your friendships</Link>
          </>
        )}
      </div>
      <ProfileEditor
        profile={profile as OwnerProfile}
        email={user.email ?? ""}
      />
    </Frame>
  );
}

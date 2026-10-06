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
    <Frame
      signedIn
      navigation
      ownerPhotoRevision={profile.primary_photo_path ? profile.revision : null}
    >
      <ProfileEditor
        profile={profile as OwnerProfile}
        email={user.email ?? ""}
        peopleAvailable={localPeopleAvailable()}
      />
    </Frame>
  );
}

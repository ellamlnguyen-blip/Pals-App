import { redirect } from "next/navigation";
import { requireLocalPeople } from "../../../lib/people";

/** Retain old bookmarks without keeping a separate relationship directory. */
export default function FriendshipsPage() {
  requireLocalPeople();
  redirect("/people");
}

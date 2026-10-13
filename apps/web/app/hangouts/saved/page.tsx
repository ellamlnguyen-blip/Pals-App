import Link from "next/link";
import { Frame } from "../../components";
import { requireAccess } from "../../../lib/access";
import { requireLocalHangouts } from "../../../lib/hangouts";
import { SavedDiscovery } from "./saved-discovery";
import "../map.css";
import "./saved.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function SavedHangoutsPage() {
  requireLocalHangouts();
  await requireAccess("ready");
  return (
    <Frame signedIn navigation>
      <div className="saved-page">
        <section className="welcome-hero" aria-labelledby="hangouts-heading">
          <div>
            <h1 id="hangouts-heading">
              <span>Meet up.</span>
              <span>Make it happen.</span>
            </h1>
            <p className="intro">
              College is too short to wait around for good things to come to
              you. Find a Hangout, meet your next friends, and make time for
              each other at UNC.
            </p>
          </div>
          <Link className="button" href="/hangouts/new">
            Create Hangout
          </Link>
        </section>
        <SavedDiscovery
          token={
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
              ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
              : ""
          }
        />
      </div>
    </Frame>
  );
}

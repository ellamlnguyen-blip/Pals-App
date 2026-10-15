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
        <section
          className="saved-map-heading"
          aria-labelledby="hangouts-heading"
        >
          <div className="saved-map-title">
            <h1 id="hangouts-heading">Hangouts</h1>
          </div>
          <Link className="button saved-create" href="/hangouts/new">
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

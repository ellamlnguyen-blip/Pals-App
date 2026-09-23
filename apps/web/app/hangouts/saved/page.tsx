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
    <Frame signedIn>
      <main className="saved-page" id="main">
        <Link href="/hangouts">← Hangouts</Link>
        <div className="saved-heading">
          <div>
            <p className="badge">Saved Hangouts · local only</p>
            <h1>Plans around UNC</h1>
            <p>
              Explore approximate campus places. Pick a saved Hangout to see the
              details.
            </p>
          </div>
          <Link className="button" href="/hangouts/new">
            + Create Hangout
          </Link>
        </div>
        <SavedDiscovery
          token={
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
              ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
              : ""
          }
        />
      </main>
    </Frame>
  );
}

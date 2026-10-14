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
            <p>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="currentColor"
              >
                <path d="M12 2a8 8 0 0 0-8 8c0 5.3 8 12 8 12s8-6.7 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
              </svg>{" "}
              UNC Chapel Hill
            </p>
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

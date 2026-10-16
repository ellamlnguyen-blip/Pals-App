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
        <h1 className="sr-only">Hangouts</h1>
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

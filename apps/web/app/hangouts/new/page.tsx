import Link from "next/link";
import { Frame } from "../../components";
import { requireAccess } from "../../../lib/access";
import { requireLocalHangouts } from "../../../lib/hangouts";
import { HangoutEditor } from "../editor";
import "../create.css";
export default async function NewHangoutPage() {
  await requireAccess("ready");
  requireLocalHangouts();
  return (
    <Frame signedIn>
      <div className="hangout-page-heading">
        <Link href="/hangouts">← Hangouts</Link>
        <p className="badge">Local UNC Hangout</p>
        <h1>Make a plan</h1>
        <p>
          A title, campus time and broad area are enough. Your Hangout saves for
          UNC students; map discovery and chat arrive later.
        </p>
      </div>
      <HangoutEditor
        token={
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
            ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
            : ""
        }
      />
    </Frame>
  );
}

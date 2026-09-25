import Link from "next/link";
import { Frame } from "../../../../components";
import { requireAccess } from "../../../../../lib/access";
import { requireLocalHangouts } from "../../../../../lib/hangouts";
import { readSavedDetail } from "../../../../../lib/saved-hangouts";
import { HangoutEditor } from "../../../editor";
import "../../../create.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function SavedEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireLocalHangouts();
  await requireAccess("ready");
  const { id } = await params;
  const result = await readSavedDetail(id);
  if (
    result.kind !== "ok" ||
    result.record.status !== "published" ||
    (result.ownRole !== "host" && result.ownRole !== "cohost")
  )
    return (
      <Frame signedIn navigation>
        <div className="hangout-page-heading">
          <h1>Editing unavailable</h1>
          <p>Your Hangout role or access may have changed.</p>
          <Link href={`/hangouts/saved/${id}`}>Review Hangout</Link>
        </div>
      </Frame>
    );
  const record = {
    ...result.record,
    private_instructions: result.instructions ?? "",
  };
  return (
    <Frame signedIn navigation>
      <div className="hangout-page-heading">
        <Link href={`/hangouts/saved/${id}`}>← Hangout</Link>
        <p className="badge">Manage Hangout · local only</p>
        <h1>Edit {record.title}</h1>
        <p>
          Changes to public details and private instructions affect everyone
          currently joined.
        </p>
      </div>
      <HangoutEditor
        key={`${id}-${record.revision}`}
        existing={record}
        returnHref={`/hangouts/saved/${id}`}
        token={
          process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
            ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
            : ""
        }
      />
    </Frame>
  );
}

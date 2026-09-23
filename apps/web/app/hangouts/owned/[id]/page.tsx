import Link from "next/link";
import { notFound } from "next/navigation";
import { Frame } from "../../../components";
import { ownedHangout } from "../../../../lib/hangouts";
import { campusLocal } from "../../../../lib/hangout-time";
import { HangoutEditor } from "../../editor";
import "../../create.css";
export default async function OwnedHangoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const record = await ownedHangout(id);
  if (!record) notFound();
  const { edit } = await searchParams;
  return (
    <Frame signedIn>
      <div className="hangout-page-heading">
        <Link href="/hangouts">← Hangouts</Link>
        <p className="badge">Your saved Hangout · local only</p>
        <h1>{record.title}</h1>
        <p>
          {record.status === "published"
            ? "Saved for ready UNC students. This plan appears in local Saved Hangouts discovery; chat is not connected yet."
            : "This Hangout was cancelled and cannot be edited."}
        </p>
      </div>
      {edit === "1" && record.status === "published" ? (
        <HangoutEditor
          key={`${record.id}-${record.revision}`}
          existing={record}
          token={
            process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
              ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
              : ""
          }
        />
      ) : (
        <div className="hangout-confirmation">
          <section>
            <h2>Plan</h2>
            <p>{record.description || "No description added."}</p>
            <dl>
              <dt>Starts · UNC campus time</dt>
              <dd>{campusLocal(record.starts_at).replace("T", " at ")}</dd>
              {record.ends_at && (
                <>
                  <dt>Ends · UNC campus time</dt>
                  <dd>{campusLocal(record.ends_at).replace("T", " at ")}</dd>
                </>
              )}
              <dt>Public area</dt>
              <dd>
                {record.public_place}
                {record.campus_zone ? ` · ${record.campus_zone}` : ""}
              </dd>
            </dl>
          </section>
          {record.status === "published" && (
            <section>
              <h2>Meeting instructions</h2>
              <p>
                {record.private_instructions ||
                  "No private instructions added."}
              </p>
              <p className="help">
                Only eligible participants can read these instructions. This
                owner view is private.
              </p>
            </section>
          )}
          {record.status === "published" && (
            <Link className="button" href={`/hangouts/saved/${record.id}`}>
              View saved detail
            </Link>
          )}
          {record.status === "published" && (
            <Link
              className="button"
              href={`/hangouts/owned/${record.id}?edit=1`}
            >
              Edit Hangout
            </Link>
          )}
        </div>
      )}
    </Frame>
  );
}

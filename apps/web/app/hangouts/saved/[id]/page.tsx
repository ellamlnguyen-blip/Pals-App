import Link from "next/link";
import { Frame } from "../../../components";
import { requireAccess } from "../../../../lib/access";
import { requireLocalHangouts } from "../../../../lib/hangouts";
import { readSavedDetail } from "../../../../lib/saved-hangouts";
import { MembershipControl } from "./membership-control";
import { chatAccess, readChat } from "../../../../lib/chat";
import { SafetyActions } from "../../../safety/safety-client";
import "../../create.css";
import "../saved.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function SavedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireLocalHangouts();
  await requireAccess("ready");
  const { id } = await params;
  const result = await readSavedDetail(id);
  if (result.kind !== "ok")
    return (
      <Frame signedIn>
        <main className="saved-detail" id="main">
          <Link href="/hangouts/saved">← Saved Hangouts</Link>
          <p className="badge">Saved Hangout · local only</p>
          <h1>
            {result.kind === "missing"
              ? "Hangout not found"
              : result.kind === "changed"
                ? "This Hangout changed"
                : "Hangout access unavailable"}
          </h1>
          <p>
            {result.kind === "changed"
              ? "Reload for the latest details and membership state."
              : "The plan may have been removed from your view, or your account may no longer have access."}
          </p>
          <Link href="/safety">Use retained Hangout ID recovery in Safety</Link>
        </main>
      </Frame>
    );
  const { record, ownState, roster, instructions } = result;
  const cancelled = record.status === "cancelled";
  const joined = ownState === "joined" || ownState === "host";
  const chatCaller = joined && !cancelled ? await chatAccess() : null;
  const chat =
    chatCaller?.user.id === result.userId
      ? await readChat(chatCaller.client, id)
      : null;
  return (
    <Frame signedIn>
      <main className="saved-detail" id="main">
        <Link href="/hangouts/saved">← Saved Hangouts</Link>
        <p className="badge">Saved Hangout · local only</p>
        <h1>{record.title}</h1>
        <SafetyActions actor={result.userId} target={{ mode: "hangout", id }} />
        <p className="saved-detail-state">
          {cancelled
            ? "Cancelled"
            : ownState === "removed"
              ? "You were removed"
              : ownState === "host"
                ? "You host this plan"
                : ownState === "joined"
                  ? "You're joined"
                  : ownState === "left"
                    ? "You left this plan"
                    : record.joining_state === "closed"
                      ? "Joining is closed"
                      : "Open to join"}
        </p>
        {joined && !cancelled && (
          <section className="saved-chat-entry">
            <h2>Coordinate together</h2>
            {chat?.kind === "ok" ? (
              <Link className="button" href={`/chats/hangouts/${id}`}>
                Open Hangout chat
              </Link>
            ) : (
              <p>Chat unavailable right now.</p>
            )}
          </section>
        )}
        <div className="saved-detail-grid">
          <section>
            <h2>The plan</h2>
            <p>{record.description || "No description added."}</p>
            <dl>
              <dt>Starts · UNC campus time</dt>
              <dd>{format(record.starts_at)}</dd>
              {record.ends_at && (
                <>
                  <dt>Ends · UNC campus time</dt>
                  <dd>{format(record.ends_at)}</dd>
                </>
              )}
              <dt>Approximate public area</dt>
              <dd>
                {record.public_place}
                {record.campus_zone ? ` · ${record.campus_zone}` : ""}
              </dd>
              <dt>Host account ID</dt>
              <dd className="saved-id">{record.host_id}</dd>
            </dl>
            {!cancelled && (
              <MembershipControl
                key={`${id}:${ownState}`}
                id={id}
                state={ownState}
                joining={record.joining_state}
                instructions={ownState === "joined" ? instructions : null}
              />
            )}
            {cancelled && (
              <p>Cancellation closed this plan and its private instructions.</p>
            )}
          </section>
          <aside>
            <h2>Who&apos;s joining</h2>
            {cancelled ? (
              <p>The current roster is unavailable after cancellation.</p>
            ) : roster.length ? (
              <ul className="saved-roster">
                {roster.map((accountId) => (
                  <li key={accountId}>
                    {accountId === result.userId
                      ? "You"
                      : accountId === record.host_id
                        ? "Host"
                        : "Participant"}{" "}
                    <span className="saved-id">{accountId}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No current ready participants are visible.</p>
            )}
            <p className="help">
              Only account IDs for currently ready joined members are available
              here. Names and photos are not part of this local flow.
            </p>
          </aside>
        </div>
        {ownState === "host" && joined && !cancelled && (
          <section className="saved-private">
            <h2>Private meeting instructions</h2>
            <p>
              {instructions || "The host has not added private instructions."}
            </p>
            <p className="help">
              While this Hangout stays published, joined members can read these
              instructions even after its scheduled end. Access ends if you
              leave, are removed, lose account readiness or the host cancels.
            </p>
          </section>
        )}
      </main>
    </Frame>
  );
}
function format(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "full",
    timeStyle: "short",
  });
}

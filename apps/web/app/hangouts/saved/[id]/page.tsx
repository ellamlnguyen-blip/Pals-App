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
import "./detail.css";
import { AnalyticsView } from "../../../analytics-view";
import {
  HostDetailBoundary,
  HostJoiningControl,
  PrivateDetail,
} from "./host-joining-control";
import { ManagementControls } from "./management-controls";
import { PublicPlaceMap } from "./public-place-map";

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
  let result = await readSavedDetail(id);
  let chat: Awaited<ReturnType<typeof readChat>> | null = null;
  let chatUserId: string | null = null;
  if (
    result.kind === "ok" &&
    result.record.status === "published" &&
    (result.ownState === "joined" || result.ownState === "host")
  ) {
    const chatCaller = await chatAccess();
    if (chatCaller?.user.id === result.userId) {
      chatUserId = chatCaller.user.id;
      chat = await readChat(chatCaller.client, id);
    }
    // Chat and detail are separate sources. Recheck detail last.
    result = await readSavedDetail(id);
  }
  if (result.kind !== "ok")
    return (
      <Frame signedIn navigation>
        <div className="saved-detail pals-detail">
          <Link href="/hangouts/saved">← Hangouts</Link>
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
        </div>
      </Frame>
    );
  const { record, ownState, roster, instructions } = result;
  const cancelled = record.status === "cancelled";
  const joined = ownState === "joined" || ownState === "host";
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.")
    ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    : "";
  const latitude = record.public_latitude;
  const longitude = record.public_longitude;
  return (
    <Frame signedIn navigation>
      <AnalyticsView event="hangout_detail_viewed" />
      <HostDetailBoundary key={`${id}:${record.revision}`}>
        <div className="saved-detail pals-detail">
          <div className="pals-detail-top">
            <Link href="/hangouts/saved">← Hangouts</Link>
            <SafetyActions
              actor={result.userId}
              target={{ mode: "hangout", id }}
            />
          </div>
          <div className="pals-detail-grid">
            <div className="pals-detail-plan">
              <p className="pals-detail-eyebrow">UNC Hangout</p>
              <h1>{record.title}</h1>
              <p className="saved-detail-state">
                {cancelled
                  ? "Cancelled"
                  : ownState === "removed"
                    ? "You were removed"
                    : ownState === "host"
                      ? "You host this plan"
                      : ownState === "joined"
                        ? "You’re joined"
                        : ownState === "left"
                          ? "You left this plan"
                          : record.joining_state === "closed"
                            ? "Joining is closed"
                            : "Open to join"}
              </p>
              {!cancelled ? (
                <ManagementControls
                  key={record.revision}
                  id={id}
                  revision={record.revision}
                  actorId={result.userId}
                  role={
                    result.ownRole === "host" || result.ownRole === "cohost"
                      ? result.ownRole
                      : null
                  }
                  roster={roster}
                  rosterMore={result.rosterMore}
                  assignments={result.assignments}
                  assignmentsMore={result.assignmentsMore}
                />
              ) : (
                <p className="pals-detail-muted">
                  The current attendee list is unavailable after cancellation.
                </p>
              )}
              <div className="pals-detail-time">
                <span aria-hidden="true" className="pals-detail-icon">
                  ▣
                </span>
                <div>
                  <strong>{format(record.starts_at)}</strong>
                  {record.ends_at && <span>Ends {format(record.ends_at)}</span>}
                  <small>UNC campus time</small>
                </div>
              </div>
              <p className="pals-detail-description">
                {record.description || "No description added."}
              </p>
              {!cancelled && joined && (
                <section className="pals-detail-chat" aria-label="Hangout chat">
                  {chatUserId === result.userId && chat?.kind === "ok" ? (
                    <Link className="button" href={`/chats/hangouts/${id}`}>
                      Open Hangout chat
                    </Link>
                  ) : (
                    <p>Chat unavailable right now.</p>
                  )}
                </section>
              )}
              {(!cancelled || (ownState === "joined" && cancelled)) && (
                <MembershipControl
                  key={`${id}:${ownState}`}
                  id={id}
                  state={ownState}
                  joining={record.joining_state}
                  instructions={ownState === "joined" ? instructions : null}
                  cancelled={cancelled}
                />
              )}
              {cancelled && (
                <p>
                  Cancellation closed this plan and its private instructions.
                </p>
              )}
              {(result.ownRole === "host" || result.ownRole === "cohost") &&
                !cancelled && (
                  <HostJoiningControl
                    id={id}
                    revision={record.revision}
                    joining={record.joining_state}
                    largeState={
                      result.ownRole === "host" ? result.largeState : null
                    }
                  />
                )}
              {ownState === "host" && joined && !cancelled && (
                <PrivateDetail>
                  <section className="saved-private">
                    <h2>Private meeting instructions</h2>
                    <p>
                      {instructions ||
                        "The host has not added private instructions."}
                    </p>
                    <p className="help">
                      While this Hangout stays published, joined members can
                      read these instructions even after its scheduled end.
                      Access ends if you leave, are removed, lose account
                      readiness or the host cancels.
                    </p>
                  </section>
                </PrivateDetail>
              )}
            </div>
            <aside
              className="pals-detail-place"
              aria-labelledby="pals-detail-place-title"
            >
              <div className="pals-detail-place-heading">
                <span className="pals-detail-pin" aria-hidden="true">
                  ●
                </span>
                <div>
                  <h2 id="pals-detail-place-title">{record.public_place}</h2>
                  <p>
                    {record.campus_zone ? `${record.campus_zone} · ` : ""}
                    Approximate public area
                  </p>
                </div>
              </div>
              <PublicPlaceMap
                token={token}
                latitude={latitude}
                longitude={longitude}
                place={record.public_place}
              />
              <a
                className="pals-detail-map-link"
                href={`https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}&mlon=${encodeURIComponent(longitude)}#map=16/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open approximate area in map ↗
              </a>
              <p className="pals-detail-map-note">
                This pin marks the public area, not anyone’s live location.
                Joined members may have separate private meeting instructions.
              </p>
            </aside>
          </div>
        </div>
      </HostDetailBoundary>
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

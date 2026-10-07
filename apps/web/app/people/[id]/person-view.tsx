"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PeopleDetail } from "../../../lib/people";
import { SafetyActions } from "../../safety/safety-client";
import { RequestControl, type PeerDmState } from "./request-control";
import { FriendControl } from "../friend-control";
import type { FriendshipResult } from "../friend-actions";
import { AnalyticsView } from "../../analytics-view";
import { ProfileSummary } from "../../profile/profile-summary";
import { ProfileTopbar } from "../../profile/profile-topbar";
import type { StudentDestinations } from "../../student-shell";

export function PersonView({
  detail,
  back,
  friendship,
  initialDmState,
  actor,
  available,
  attendanceAvailable,
}: {
  detail: PeopleDetail;
  back: string;
  friendship: FriendshipResult;
  initialDmState: PeerDmState;
  actor: string;
  available: StudentDestinations;
  attendanceAvailable: boolean;
}) {
  const profileHeading = useRef<HTMLHeadingElement>(null),
    clearedHeading = useRef<HTMLHeadingElement>(null);
  const [cleared, setCleared] = useState(false),
    [message, setMessage] = useState("");
  const [dmState, setDmState] = useState<PeerDmState>(initialDmState);
  useEffect(() => {
    if (cleared) clearedHeading.current?.focus();
  }, [cleared]);
  useEffect(() => {
    profileHeading.current?.focus();
  }, []);
  if (cleared)
    return (
      <article className="people-profile">
        <ProfileTopbar
          back={back}
          backLabel="Back to People"
          available={available}
          attendanceAvailable={attendanceAvailable}
        >
          <p>Check your current People access from the menu.</p>
        </ProfileTopbar>
        <section className="people-panel" role="status">
          <h1 ref={clearedHeading} tabIndex={-1}>
            Checking People access
          </h1>
          <p>{message || "Checking the latest People access…"}</p>
          <div className="people-dialog-actions">
            {/* A full navigation fetches the latest outbound block list. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/people/privacy">Check outbound blocked IDs</a>
            <a href={back}>Return to People</a>
          </div>
        </section>
      </article>
    );
  return (
    <article className="people-profile">
      <AnalyticsView event="people_profile_viewed" />
      <ProfileTopbar
        back={back}
        backLabel="Back to People"
        available={available}
        attendanceAvailable={attendanceAvailable}
      >
        <p>
          Only text this person chose to share appears here. Photos and
          conversation prompts are private.
        </p>
        <SafetyActions
          actor={actor}
          target={{ mode: "user", id: detail.account_id }}
          allowBlock
          onBlockConfirmed={() => {
            setMessage("Block confirmed. Check your outbound IDs in Safety.");
            setCleared(true);
          }}
        />
      </ProfileTopbar>
      <ProfileSummary
        name={detail.real_name}
        bio={detail.bio}
        campus={detail.campus_name}
        major={detail.major}
        graduationYear={detail.graduation_year}
        verified
        headingRef={profileHeading}
      />
      <div className="profile-peer-actions">
        <FriendControl
          peerId={detail.account_id}
          initial={friendship}
          canRequest
          canBlock={false}
          peerLabel={detail.real_name}
          onClear={() => setCleared(true)}
        />
        {dmState === "accepted" || dmState === "pending" ? (
          <Link
            href={`/chats/direct/${detail.account_id}`}
            className="profile-outline-button"
          >
            {dmState === "accepted" ? "Open chat" : "Check request"}
          </Link>
        ) : dmState === "unknown" ? (
          <a
            href={`/people/${detail.account_id}`}
            className="profile-outline-button"
          >
            Check chat status
          </a>
        ) : (
          <a
            href="#request-heading"
            className="profile-outline-button"
            onClick={(event) => {
              event.preventDefault();
              const field = document.getElementById("dm-request-body");
              if (field instanceof HTMLTextAreaElement && !field.disabled)
                field.focus();
              else document.getElementById("request-heading")?.focus();
            }}
          >
            Say hi
          </a>
        )}
      </div>
      <div className="people-detail-body profile-peer-interests">
        <section>
          <h2>Interests</h2>
          {detail.interests.length ? (
            <ul>
              {detail.interests.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>Not added</p>
          )}
        </section>
        <section>
          <h2>Down to do</h2>
          {detail.down_to_do.length ? (
            <ul>
              {detail.down_to_do.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>Not added</p>
          )}
        </section>
      </div>
      <RequestControl
        peerId={detail.account_id}
        actor={actor}
        state={dmState}
        onSent={() => setDmState("pending")}
        onUnavailable={() => {
          setDmState("unknown");
          setMessage(
            "People access changed. Return to People to check current availability.",
          );
          setCleared(true);
        }}
      />
    </article>
  );
}

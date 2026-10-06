"use client";
import { useEffect, useRef, useState } from "react";
import type { PeopleDetail } from "../../../lib/people";
import { SafetyActions } from "../../safety/safety-client";
import { RequestControl } from "./request-control";
import { FriendControl } from "../friend-control";
import type { FriendshipResult } from "../friend-actions";
import { AnalyticsView } from "../../analytics-view";
import { ProfileSummary } from "../../profile/profile-summary";

export function PersonView({
  detail,
  back,
  friendship,
  actor,
}: {
  detail: PeopleDetail;
  back: string;
  friendship: FriendshipResult;
  actor: string;
}) {
  const profileHeading = useRef<HTMLHeadingElement>(null),
    clearedHeading = useRef<HTMLHeadingElement>(null);
  const [cleared, setCleared] = useState(false),
    [message, setMessage] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => {
    if (cleared) clearedHeading.current?.focus();
  }, [cleared]);
  useEffect(() => {
    profileHeading.current?.focus();
  }, []);
  if (cleared)
    return (
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
    );
  return (
    <article className="people-profile">
      <AnalyticsView event="people_profile_viewed" />
      <nav className="profile-topbar" aria-label="Profile controls">
        <a href={back} aria-label="Back to People">
          ← <span>Back</span>
        </a>
        <span className="profile-topbar-title">Pals</span>
        <button
          type="button"
          aria-expanded={optionsOpen}
          aria-controls="peer-profile-options"
          onClick={() => setOptionsOpen(!optionsOpen)}
          aria-label="Profile options"
        >
          •••
        </button>
      </nav>
      {optionsOpen && (
        <div className="profile-options" id="peer-profile-options">
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
        </div>
      )}
      <div
        className="peer-photo-placeholder"
        aria-label="Profile photos are private"
      >
        <span aria-hidden="true">✦</span>
        <p>Get to know each other through a Hangout</p>
      </div>
      <ProfileSummary
        name={detail.real_name}
        bio={detail.bio}
        campus={detail.campus_name}
        major={detail.major}
        graduationYear={detail.graduation_year}
        headingRef={profileHeading}
      />
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
      <h2 className="profile-connect-heading">Make a plan together</h2>
      <div className="profile-peer-actions">
        <FriendControl
          peerId={detail.account_id}
          initial={friendship}
          canRequest
          canBlock={false}
          peerLabel={detail.real_name}
          onClear={() => setCleared(true)}
        />
        <a href="#request-heading" className="profile-outline-button">
          Say hi
        </a>
      </div>
      <RequestControl peerId={detail.account_id} actor={actor} />
    </article>
  );
}

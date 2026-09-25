"use client";
import { useEffect, useRef, useState } from "react";
import type { PeopleDetail } from "../../../lib/people";
import { SafetyActions } from "../../safety/safety-client";
import { RequestControl } from "./request-control";
import { FriendControl } from "../friend-control";
import type { FriendshipResult } from "../friend-actions";
import { AnalyticsView } from "../../analytics-view";

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
    <article className="people-panel">
      <AnalyticsView event="people_profile_viewed" />
      <p className="badge">People · local UNC</p>
      <h1 ref={profileHeading} tabIndex={-1}>
        {detail.real_name}
      </h1>
      <p>
        {detail.campus_name} · Class of {detail.graduation_year} ·{" "}
        {detail.major}
      </p>
      <div className="people-detail-body">
        <section>
          <h2>About</h2>
          <p>{detail.bio}</p>
        </section>
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
      <FriendControl
        peerId={detail.account_id}
        initial={friendship}
        canRequest
        canBlock={false}
        peerLabel={detail.real_name}
        onClear={() => setCleared(true)}
      />
      <RequestControl peerId={detail.account_id} actor={actor} />
      <SafetyActions
        actor={actor}
        target={{ mode: "user", id: detail.account_id }}
        allowBlock
        onBlockConfirmed={() => {
          setMessage("Block confirmed. Check your outbound IDs in Safety.");
          setCleared(true);
        }}
      />
    </article>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import type { PeopleDetail } from "../../../lib/people";
import { blockPerson } from "../actions";
import { RequestControl } from "./request-control";
import { FriendControl } from "../friend-control";
import type { FriendshipResult } from "../friend-actions";

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
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    profileHeading = useRef<HTMLHeadingElement>(null),
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
      <div className="people-block">
        <button
          ref={trigger}
          className="text-button"
          disabled
          onClick={() => dialog.current?.showModal()}
        >
          New blocking temporarily unavailable
        </button>
        <dialog
          ref={dialog}
          onClose={() => {
            if (!cleared) trigger.current?.focus();
          }}
          aria-labelledby="block-heading"
          aria-describedby="block-explain"
        >
          <h2 id="block-heading">Block {detail.real_name} in People?</h2>
          <p id="block-explain">
            You will be hidden from each other in People discovery. Any current
            friend request or friendship and active direct request or chat ends,
            even if its status is unavailable. A confirmed block now affects
            Hangout access and may end shared attendance. Creating a block is
            temporarily unavailable.
          </p>
          <div className="people-dialog-actions">
            <button
              className="button"
              disabled
              onClick={async () => {
                dialog.current?.close();
                setCleared(true);
                try {
                  const result = await blockPerson(detail.account_id);
                  setMessage(result.message);
                } catch {
                  setMessage(
                    "We could not confirm the block. Check your blocked IDs before another action.",
                  );
                }
              }}
            >
              New blocking temporarily unavailable
            </button>
            <button
              className="text-button"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
          </div>
        </dialog>
      </div>
    </article>
  );
}

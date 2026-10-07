"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RichPeopleDetail } from "@pals/types";
import type { PeopleDetail } from "../../../lib/people";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
} from "../../auth-transition";
import { SafetyActions } from "../../safety/safety-client";
import { RequestControl, type PeerDmState } from "./request-control";
import { FriendControl } from "../friend-control";
import type { FriendshipResult } from "../friend-actions";
import { AnalyticsView } from "../../analytics-view";
import { ProfileSummary } from "../../profile/profile-summary";
import { ProfileTopbar } from "../../profile/profile-topbar";
import type { StudentDestinations } from "../../student-shell";
import { PeerPhoto, peerPhotoUrl } from "./peer-photo";

export function PersonView({
  detail,
  richDetail,
  back,
  friendship,
  initialDmState,
  actor,
  available,
  attendanceAvailable,
}: {
  detail: PeopleDetail;
  richDetail: RichPeopleDetail | null;
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
  const [selectedPhoto, setSelectedPhoto] = useState<{
    slot: RichPeopleDetail["photo_slots"][number];
    label: string;
  } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const photoTrigger = useRef<HTMLButtonElement | null>(null);
  const dialogAction = useRef<HTMLButtonElement>(null);
  const clearedRef = useRef(false);
  const clear = useCallback((note: string) => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    photoDialog.current?.close();
    setSelectedPhoto(null);
    setViewingPhoto(false);
    setMessage(note);
    setCleared(true);
  }, []);
  useEffect(() => {
    const conceal = () =>
      clear(
        "Profile access may have changed. Reload to check the current profile.",
      );
    const visibility = () => {
      if (document.hidden) conceal();
    };
    window.addEventListener(AUTH_TRANSITION_EVENT, conceal);
    window.addEventListener("pagehide", conceal);
    document.addEventListener("visibilitychange", visibility);
    const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    channel.onmessage = conceal;
    return () => {
      window.removeEventListener(AUTH_TRANSITION_EVENT, conceal);
      window.removeEventListener("pagehide", conceal);
      document.removeEventListener("visibilitychange", visibility);
      channel.close();
    };
  }, [clear]);
  useEffect(() => {
    if (cleared) clearedHeading.current?.focus();
  }, [cleared]);
  useEffect(() => {
    profileHeading.current?.focus();
  }, []);
  useEffect(() => {
    if (selectedPhoto && photoDialog.current?.open)
      dialogAction.current?.focus();
  }, [selectedPhoto, viewingPhoto]);
  function openPhoto(
    slot: RichPeopleDetail["photo_slots"][number],
    label: string,
    trigger: HTMLButtonElement,
  ) {
    if (clearedRef.current) return;
    photoTrigger.current = trigger;
    setSelectedPhoto({ slot, label });
    setViewingPhoto(false);
    photoDialog.current?.showModal();
  }
  const primary = richDetail?.photo_slots.includes("primary") ?? false;
  const extras =
    richDetail?.photo_slots.filter((slot) => slot !== "primary") ?? [];
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
            <a href={`/people/${detail.account_id}`}>Reload current profile</a>
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
          {richDetail
            ? "This person chose to share these details with eligible students at their campus."
            : "Only the text this person chose to share appears here. Photos, hometown and prompts require a separate sharing choice."}
        </p>
        <SafetyActions
          actor={actor}
          target={{ mode: "user", id: detail.account_id }}
          allowBlock
          onBlockConfirmed={() => {
            clear("Block confirmed. Check your outbound IDs in Safety.");
          }}
        />
      </ProfileTopbar>
      {primary && richDetail && (
        <div className="profile-hero">
          <PeerPhoto
            subjectId={detail.account_id}
            slot="primary"
            revision={richDetail.photo_revision}
            label={`${detail.real_name} primary photo`}
            onSelect={openPhoto}
            onUnavailable={() =>
              clear(
                "This profile photo is no longer available. Reload to check current sharing.",
              )
            }
          />
        </div>
      )}
      <dialog
        ref={photoDialog}
        className="profile-photo-dialog"
        aria-label={
          selectedPhoto ? `${selectedPhoto.label} options` : "Photo options"
        }
        onClose={() => {
          setViewingPhoto(false);
          if (!clearedRef.current) photoTrigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === photoDialog.current)
            photoDialog.current?.close();
        }}
      >
        {selectedPhoto && richDetail && (
          <div className="profile-photo-dialog-content">
            <div className="profile-photo-dialog-header">
              <h2>{selectedPhoto.label}</h2>
              <button
                ref={viewingPhoto ? dialogAction : undefined}
                className="profile-photo-dialog-close"
                type="button"
                aria-label="Close photo"
                onClick={() => photoDialog.current?.close()}
              >
                Close
              </button>
            </div>
            {viewingPhoto ? (
              <div className="profile-photo-large">
                <Image
                  src={peerPhotoUrl(
                    detail.account_id,
                    selectedPhoto.slot,
                    richDetail.photo_revision,
                  )}
                  alt={selectedPhoto.label}
                  width={1200}
                  height={1200}
                  unoptimized
                  onError={() =>
                    clear(
                      "This profile photo is no longer available. Reload to check current sharing.",
                    )
                  }
                />
              </div>
            ) : (
              <div className="profile-photo-dialog-actions">
                <button
                  ref={dialogAction}
                  type="button"
                  onClick={() => setViewingPhoto(true)}
                >
                  View photo
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
      <ProfileSummary
        name={detail.real_name}
        hometown={richDetail?.hometown}
        bio={detail.bio}
        campus={detail.campus_name}
        major={detail.major}
        graduationYear={detail.graduation_year}
        verified={richDetail?.unc_email_verified ?? true}
        headingRef={profileHeading}
      />
      <div className="profile-peer-actions">
        <FriendControl
          peerId={detail.account_id}
          initial={friendship}
          canRequest
          canBlock={false}
          peerLabel={detail.real_name}
          onClear={() =>
            clear("People access changed. Reload to check this profile.")
          }
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
      {extras.length > 0 && richDetail && (
        <section
          className="profile-gallery-section"
          aria-labelledby="peer-gallery-heading"
        >
          <h2 id="peer-gallery-heading">A little more me</h2>
          <div className="profile-gallery">
            {extras.map((slot) => (
              <PeerPhoto
                key={slot}
                subjectId={detail.account_id}
                slot={slot}
                revision={richDetail.photo_revision}
                label={`${detail.real_name} extra photo ${Number(slot) + 1}`}
                onSelect={openPhoto}
                onUnavailable={() =>
                  clear(
                    "This profile photo is no longer available. Reload to check current sharing.",
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
      {richDetail && richDetail.prompts.length > 0 && (
        <section
          className="profile-prompts"
          aria-labelledby="peer-prompts-heading"
        >
          <h2 id="peer-prompts-heading">Let’s start a conversation</h2>
          {richDetail.prompts.slice(0, 3).map((prompt, index) => (
            <div className="profile-prompt" key={index}>
              <h3>{prompt.question}</h3>
              <p>{prompt.answer}</p>
            </div>
          ))}
        </section>
      )}
      {(detail.interests.length > 0 || detail.down_to_do.length > 0) && (
        <div className="people-detail-body profile-peer-interests">
          {detail.interests.length > 0 && (
            <section>
              <h2>Interests</h2>
              <ul>
                {detail.interests.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {detail.down_to_do.length > 0 && (
            <section>
              <h2>Down to do</h2>
              <ul>
                {detail.down_to_do.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
      <RequestControl
        peerId={detail.account_id}
        actor={actor}
        state={dmState}
        onSent={() => setDmState("pending")}
        onUnavailable={() => {
          setDmState("unknown");
          clear(
            "People access changed. Return to People to check current availability.",
          );
        }}
      />
    </article>
  );
}

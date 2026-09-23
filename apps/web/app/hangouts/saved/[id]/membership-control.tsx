"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ParticipantState } from "../../../../lib/saved-hangouts-types";
import { changeSavedMembership } from "../actions";

export function MembershipControl({
  id,
  state,
  joining,
  instructions,
}: {
  id: string;
  state: ParticipantState;
  joining: string;
  instructions: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [privateVisible, setPrivateVisible] = useState(true);
  const [needsReload, setNeedsReload] = useState(false);
  const intent = state === "joined" ? "leave" : "join";
  const allowed =
    state === "joined" ||
    ((state === "none" || state === "left") && joining === "open");
  if (state === "host")
    return (
      <p className="saved-action-note">
        Hosts are already joined and cannot leave.
      </p>
    );
  if (state === "removed")
    return (
      <p className="saved-action-note">You cannot rejoin after removal.</p>
    );
  return (
    <div className="saved-action">
      {allowed ? (
        <button
          className="button"
          disabled={pending || needsReload}
          onClick={() => {
            setMessage("");
            setNeedsReload(true);
            if (intent === "leave") setPrivateVisible(false);
            startTransition(async () => {
              try {
                const result = await changeSavedMembership(id, intent);
                setMessage(result.message);
                if (result.kind === "saved") router.refresh();
              } catch {
                setMessage(
                  "We could not verify the outcome. Reload this Hangout before trying again.",
                );
              }
            });
          }}
        >
          {pending
            ? "Checking…"
            : intent === "join"
              ? state === "left"
                ? "Rejoin Hangout"
                : "Join Hangout"
              : "Leave Hangout"}
        </button>
      ) : (
        <p>Joining is closed. Existing members remain joined.</p>
      )}
      {message && (
        <p role="status" className="saved-action-note">
          {message}{" "}
          {needsReload && (
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          )}
        </p>
      )}
      {state === "joined" && privateVisible && (
        <section className="saved-private">
          <h2>Private meeting instructions</h2>
          <p>
            {instructions || "The host has not added private instructions."}
          </p>
          <p className="help">
            While this Hangout stays published, joined members can read these
            instructions even after its scheduled end. Access ends if you leave,
            are removed, lose account readiness or the host cancels.
          </p>
        </section>
      )}
    </div>
  );
}

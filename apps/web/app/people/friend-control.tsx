"use client";

import { useEffect, useRef, useState } from "react";
import { blockPerson } from "./actions";
import {
  changeFriendship,
  createFriendRequest,
  readFriendship,
  type Friendship,
  type FriendshipResult,
  type FriendshipTransition,
} from "./friend-actions";

const label = (row: Friendship | null) =>
  !row
    ? "No current request or friendship"
    : row.state === "accepted"
      ? "Friends"
      : row.direction === "incoming"
        ? "Incoming request"
        : "Outgoing request";
const explanation = (action: FriendshipTransition | "block") => {
  if (action === "decline" || action === "cancel")
    return "This request will end. The same requester cannot send another request to this recipient in this local version.";
  if (action === "unfriend")
    return "The current friendship will end. Connecting again later needs a new request.";
  if (action === "block")
    return "Blocking ends any current request or friendship and hides both of you in People. Existing Hangout participation and private instructions do not change.";
  return "Accept this request and become friends?";
};

export function FriendControl({
  peerId,
  initial,
  canRequest,
  canBlock,
  peerLabel,
  onClear,
}: {
  peerId: string;
  initial: FriendshipResult;
  canRequest: boolean;
  canBlock: boolean;
  peerLabel: string;
  onClear?: () => void;
}) {
  const [result, setResult] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmation, setConfirmation] = useState<
    FriendshipTransition | "block" | null
  >(null);
  const [requestKey, setRequestKey] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const clear = () => {
      alive.current = false;
      setBlocked(true);
    };
    const returnCheck = () => {
      if (document.visibilityState === "visible") window.location.reload();
    };
    window.addEventListener("pagehide", clear);
    document.addEventListener("visibilitychange", returnCheck);
    return () => {
      alive.current = false;
      window.removeEventListener("pagehide", clear);
      document.removeEventListener("visibilitychange", returnCheck);
    };
  }, []);
  const apply = (next: FriendshipResult) => {
    if (!alive.current) return;
    setResult(next);
    if (
      next.state === "unavailable" ||
      next.state === "unknown" ||
      next.state === "stale"
    ) {
      setBlocked(true);
      if (next.state !== "unknown") onClear?.();
    }
    status.current?.focus();
  };
  const run = async (action: FriendshipTransition | "block" | "create") => {
    setBusy(true);
    setConfirmed(false);
    if (action === "block") {
      setBlocked(true);
      onClear?.();
    }
    try {
      if (action === "block") {
        const outcome = await blockPerson(peerId);
        apply({
          state: outcome.state === "hidden" ? "known" : "unknown",
          relationship: null,
          message: outcome.message,
        });
        setBlocked(true);
      } else if (action === "create") {
        const key = requestKey ?? crypto.randomUUID();
        setRequestKey(key);
        apply(await createFriendRequest(peerId, key));
      } else if (result.relationship) {
        apply(
          await changeFriendship(
            peerId,
            result.relationship.generation_id,
            action,
          ),
        );
        setRequestKey(null);
      }
    } catch {
      apply({
        state: "unknown",
        relationship: null,
        message: "Outcome unknown. Reload before another action.",
      });
      setBlocked(true);
    } finally {
      setBusy(false);
    }
  };
  const open = (action: FriendshipTransition | "block") => {
    setConfirmation(action);
    trigger.current =
      document.activeElement instanceof HTMLButtonElement
        ? document.activeElement
        : null;
    dialog.current?.showModal();
  };
  const row = result.relationship;
  const disabled = busy || blocked || result.state !== "known";
  return (
    <div className="friend-control">
      <p ref={status} tabIndex={-1} role="status">
        <strong>
          {blocked && confirmation === "block"
            ? busy
              ? "Checking block"
              : result.state === "known"
                ? "Outbound block confirmed"
                : "Block outcome unknown"
            : label(row)}
        </strong>{" "}
        · {result.message}
      </p>
      {!blocked && result.state === "known" && (
        <div className="friend-actions">
          {!row && canRequest && (
            <button
              className="button"
              disabled={disabled}
              onClick={() => run("create")}
            >
              {requestKey
                ? "Retry request with same key"
                : "Send friend request"}
            </button>
          )}
          {row?.state === "pending" && row.direction === "incoming" && (
            <>
              <button
                className="button"
                disabled={disabled}
                onClick={() => open("accept")}
              >
                Accept request
              </button>
              <button
                className="text-button"
                disabled={disabled}
                onClick={() => open("decline")}
              >
                Decline
              </button>
            </>
          )}
          {row?.state === "pending" && row.direction === "outgoing" && (
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => open("cancel")}
            >
              Cancel request
            </button>
          )}
          {row?.state === "accepted" && (
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => open("unfriend")}
            >
              Unfriend
            </button>
          )}
          {row && canBlock && (
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => open("block")}
            >
              Block in People
            </button>
          )}
        </div>
      )}
      {result.state === "stale" && (
        <a
          href={
            typeof window === "undefined"
              ? "/people/friends"
              : window.location.pathname
          }
        >
          Reload current status
        </a>
      )}
      {result.state === "unknown" && (
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            const fresh = await readFriendship(peerId);
            if (fresh.state === "known") setBlocked(false);
            apply(fresh);
          }}
        >
          Check current status
        </button>
      )}
      {(result.state === "unknown" || result.state === "unavailable") && (
        <a
          href={
            typeof window === "undefined"
              ? "/people/friends"
              : window.location.pathname
          }
        >
          Reload
        </a>
      )}
      <dialog
        ref={dialog}
        onClose={() => {
          setConfirmed(false);
          trigger.current?.focus();
        }}
        aria-labelledby={`friend-confirm-${peerId}`}
      >
        <h2 id={`friend-confirm-${peerId}`}>
          {confirmation === "block"
            ? "Block"
            : confirmation === "unfriend"
              ? "Unfriend"
              : confirmation === "decline"
                ? "Decline request from"
                : confirmation === "cancel"
                  ? "Cancel request to"
                  : "Accept request from"}{" "}
          {peerLabel}?
        </h2>
        <p>
          <code>{peerId}</code>
        </p>
        <p>{confirmation && explanation(confirmation)}</p>
        <label className="friend-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />{" "}
          I understand
        </label>
        <div className="people-dialog-actions">
          <button
            className="button"
            disabled={!confirmed || busy}
            onClick={() => {
              const action = confirmation;
              dialog.current?.close();
              if (action) void run(action);
            }}
          >
            Confirm
          </button>
          <button
            className="text-button"
            onClick={() => dialog.current?.close()}
          >
            Keep current state
          </button>
        </div>
      </dialog>
    </div>
  );
}

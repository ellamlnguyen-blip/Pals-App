"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  manageHangout,
  managementPage,
  type ManagementIntent,
} from "../management-actions";
import { useDetailAccess } from "./host-joining-control";

type Row = {
  account_id: string;
  role_label: "host" | "cohost" | "participant";
};
export function ManagementControls({
  id,
  revision,
  actorId,
  role,
  roster: initialRoster,
  rosterMore: initialRosterMore,
  assignments: initialAssignments,
  assignmentsMore: initialAssignmentsMore,
}: {
  id: string;
  revision: number;
  actorId: string;
  role: "host" | "cohost" | null;
  roster: Row[];
  rosterMore: boolean;
  assignments: string[];
  assignmentsMore: boolean;
}) {
  const router = useRouter();
  const { deny, hidePrivate } = useDetailAccess();
  const [roster, setRoster] = useState(initialRoster);
  const [rosterMore, setRosterMore] = useState(initialRosterMore);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [assignmentsMore, setAssignmentsMore] = useState(
    initialAssignmentsMore,
  );
  const [pending, start] = useTransition();
  const [locked, setLocked] = useState(false);
  const [sensitiveHidden, setSensitiveHidden] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"roster" | "assignments" | null>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) resultRef.current?.focus();
  }, [message]);
  function loadMore(type: "roster" | "assignments") {
    setLoading(type);
    start(async () => {
      try {
        const list = type === "roster" ? roster : assignments;
        const last = list.at(-1);
        const result = await managementPage(
          id,
          type,
          typeof last === "string" ? last : (last?.account_id ?? null),
        );
        if (result.kind === "denied") {
          deny();
          return;
        }
        if (result.kind !== "ok" || result.revision !== revision) {
          setSensitiveHidden(true);
          setRoster([]);
          setAssignments([]);
          setLocked(true);
          setMessage("The list or your access changed. Reload to review it.");
          return;
        }
        if (type === "roster") {
          setRoster((old) => [...old, ...(result.rows as Row[])]);
          setRosterMore(result.more);
        } else {
          setAssignments((old) => [
            ...old,
            ...result.rows.map((row: { account_id: string }) => row.account_id),
          ]);
          setAssignmentsMore(result.more);
        }
      } catch {
        setSensitiveHidden(true);
        setRoster([]);
        setAssignments([]);
        setLocked(true);
        setMessage("The list is unavailable. Reload before managing people.");
      } finally {
        setLoading(null);
      }
    });
  }
  function act(intent: ManagementIntent, target?: string) {
    const prompts: Record<ManagementIntent, string> = {
      promote:
        "Make this joined participant a co-host? They can edit public and private details, control joining, and remove ordinary attendees. They can step down or leave.",
      demote:
        "Remove this co-host assignment? They stay joined and can still read private meeting instructions while eligible. They lose management powers.",
      step_down:
        "Step down as co-host? You stay joined and can still read private meeting instructions while eligible.",
      remove:
        "Remove this participant? They lose future access to this Hangout and cannot rejoin. This is different from demoting a co-host.",
      cancel:
        "Cancel this Hangout for everyone? Joining and edits close, and private meeting instructions become unavailable.",
    };
    if (!window.confirm(prompts[intent])) return;
    if (intent === "cancel") {
      hidePrivate();
      setSensitiveHidden(true);
      setRoster([]);
      setAssignments([]);
    }
    setLocked(true);
    setMessage("");
    start(async () => {
      try {
        const result = await manageHangout(id, revision, intent, target);
        if (result.kind === "denied") {
          deny();
          return;
        }
        if (result.kind !== "saved") {
          setSensitiveHidden(true);
          setRoster([]);
          setAssignments([]);
        }
        setMessage(result.message);
        if (result.kind === "saved") router.refresh();
      } catch {
        setSensitiveHidden(true);
        setRoster([]);
        setAssignments([]);
        setMessage(
          "The response may have been lost. Reload and review the Hangout before another action.",
        );
      }
    });
  }
  return (
    <>
      {role && (
        <section className="saved-management" aria-labelledby="manage-title">
          <h2 id="manage-title">Manage this Hangout</h2>
          <p className="help">
            {locked
              ? "Management is paused until you reload and review this Hangout."
              : role === "host"
                ? "You can edit, assign co-hosts, remove attendees, or cancel."
                : "You can edit, control joining, remove ordinary attendees, or step down."}
          </p>
          <div className="saved-management-actions">
            {!locked && (
              <Link
                className="button"
                href={
                  role === "host"
                    ? `/hangouts/owned/${id}?edit=1`
                    : `/hangouts/saved/${id}/edit`
                }
              >
                Edit details
              </Link>
            )}
            {role === "host" ? (
              <button
                className="quiet-button"
                disabled={pending || locked}
                onClick={() => act("cancel")}
              >
                Cancel Hangout
              </button>
            ) : (
              <button
                className="quiet-button"
                disabled={pending || locked}
                onClick={() => act("step_down")}
              >
                Step down
              </button>
            )}
          </div>
          {message && (
            <p
              ref={resultRef}
              tabIndex={-1}
              role="status"
              className="saved-action-note"
            >
              {message}{" "}
              {locked && (
                <button
                  className="text-button"
                  onClick={() => window.location.reload()}
                >
                  Reload and review
                </button>
              )}
            </p>
          )}
        </section>
      )}
      {!sensitiveHidden ? (
        <section
          className="saved-management-roster"
          aria-labelledby="roster-title"
        >
          <h2 id="roster-title">Who&apos;s joining</h2>
          {roster.length ? (
            <ul className="saved-roster">
              {roster.map((row) => (
                <li key={row.account_id}>
                  <strong>
                    {row.account_id === actorId
                      ? "You"
                      : row.role_label === "cohost"
                        ? "Co-host"
                        : row.role_label === "host"
                          ? "Host"
                          : "Participant"}
                  </strong>
                  <span className="saved-id">{row.account_id}</span>
                  {role === "host" && row.role_label === "participant" && (
                    <button
                      className="text-button"
                      disabled={pending || locked}
                      onClick={() => act("promote", row.account_id)}
                    >
                      Make co-host
                    </button>
                  )}
                  {role &&
                    row.role_label === "participant" &&
                    row.account_id !== actorId && (
                      <button
                        className="text-button"
                        disabled={pending || locked}
                        onClick={() => act("remove", row.account_id)}
                      >
                        Remove participant
                      </button>
                    )}
                  {role === "host" && row.role_label === "cohost" && (
                    <>
                      <button
                        className="text-button"
                        disabled={pending || locked}
                        onClick={() => act("demote", row.account_id)}
                      >
                        Remove co-host role
                      </button>
                      <button
                        className="text-button"
                        disabled={pending || locked}
                        onClick={() => act("remove", row.account_id)}
                      >
                        Remove from Hangout
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No current ready participants are visible.</p>
          )}
          {rosterMore && (
            <button
              className="quiet-button"
              disabled={pending || locked}
              onClick={() => loadMore("roster")}
            >
              {loading === "roster" ? "Loading…" : "Show more people"}
            </button>
          )}
          <p className="help">
            Only account IDs for currently ready joined members are shown. Names
            and photos are unavailable in this local flow.
          </p>
        </section>
      ) : (
        <p className="saved-action-note">
          People are hidden until you reload and review this Hangout.
        </p>
      )}
      {role === "host" && !sensitiveHidden && (
        <section
          className="saved-management"
          aria-labelledby="assignment-title"
        >
          <h2 id="assignment-title">Co-host assignments</h2>
          <p className="help">
            This host-only list includes retained assignments for people who are
            currently not ready. Removing an assignment revokes powers if their
            access returns; it does not remove them from the Hangout.
          </p>
          {assignments.length ? (
            <ul className="saved-roster">
              {assignments.map((accountId) => (
                <li key={accountId}>
                  <span className="saved-id">{accountId}</span>
                  <button
                    className="text-button"
                    disabled={pending || locked}
                    onClick={() => act("demote", accountId)}
                  >
                    Remove co-host role
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No co-host assignments.</p>
          )}
          {assignmentsMore && (
            <button
              className="quiet-button"
              disabled={pending || locked}
              onClick={() => loadMore("assignments")}
            >
              {loading === "assignments" ? "Loading…" : "Show more assignments"}
            </button>
          )}
        </section>
      )}
    </>
  );
}

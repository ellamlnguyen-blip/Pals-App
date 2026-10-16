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
import { ParticipantIdentity } from "./participant-identity";
import type { RosterIdentities } from "./roster-identities";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
} from "../../../auth-transition";

type Row = {
  account_id: string;
  role_label: "host" | "cohost" | "participant";
};
type Invitation = { invitation_id: string; recipient_id: string | null; state: string; created_at: string };
type InvitationCursor = { time: string; id: string } | null;
export function ManagementControls({
  id,
  revision,
  actorId,
  role,
  roster: initialRoster,
  identities,
  rosterMore: initialRosterMore,
  assignments: initialAssignments,
  assignmentsMore: initialAssignmentsMore,
}: {
  id: string;
  revision: number;
  actorId: string;
  role: "host" | "cohost" | null;
  roster: Row[];
  identities: RosterIdentities;
  rosterMore: boolean;
  assignments: string[];
  assignmentsMore: boolean;
}) {
  const router = useRouter();
  const { deny, hidePrivate, managementPaused, pauseManagement } =
    useDetailAccess();
  const [roster, setRoster] = useState(initialRoster);
  const visibleAttendees = roster.filter(
    (row) => row.role_label === "participant",
  );
  const [rosterMore, setRosterMore] = useState(initialRosterMore);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [assignmentsMore, setAssignmentsMore] = useState(
    initialAssignmentsMore,
  );
  const [pending, start] = useTransition();
  const [identityHidden, setIdentityHidden] = useState(false);
  const concealedRef = useRef(false);
  const visibleIdentities = identityHidden ? {} : identities;
  const [localLocked, setLocked] = useState(false);
  const locked = localLocked || managementPaused;
  const [sensitiveHidden, setSensitiveHidden] = useState(false);
  const [message, setMessage] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationLoading, setInvitationLoading] = useState(role === "host");
  const [invitationMore, setInvitationMore] = useState(false);
  const [invitationPage, setInvitationPage] = useState(0);
  const invitationCursors = useRef<InvitationCursor[]>([null]);
  const [frozenInvite, setFrozenInvite] = useState<{ recipient: string; requestId: string; revision: number } | null>(null);
  const [loading, setLoading] = useState<"roster" | "assignments" | null>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) resultRef.current?.focus();
  }, [message]);
  useEffect(() => {
    const conceal = () => {
      concealedRef.current = true;
      setIdentityHidden(true);
      setInvitations([]);
      setInvitationMore(false);
    };
    const visibility = () => {
      if (document.hidden) conceal();
    };
    window.addEventListener(AUTH_TRANSITION_EVENT, conceal);
    window.addEventListener("pagehide", conceal);
    document.addEventListener("visibilitychange", visibility);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
      channel.onmessage = conceal;
    } catch {
      /* The local event and pagehide still clear identity. */
    }
    return () => {
      window.removeEventListener(AUTH_TRANSITION_EVENT, conceal);
      window.removeEventListener("pagehide", conceal);
      document.removeEventListener("visibilitychange", visibility);
      channel?.close();
    };
  }, []);
  useEffect(() => {
    if (role !== "host" || locked || identityHidden || concealedRef.current) return;
    let alive = true;
    const cursor = invitationCursors.current[invitationPage];
    if (cursor === undefined) return;
    setInvitationLoading(true);
    const query = cursor ? `&time=${encodeURIComponent(cursor.time)}&id=${cursor.id}` : "";
    fetch(`/api/cohost?hangout=${id}${query}`, { cache: "no-store", credentials: "same-origin", headers: { "x-pals-cohost-actor": actorId } })
      .then(async (response) => {
        const data = await response.json();
        if (!alive || concealedRef.current) return;
        if (!response.ok || data.kind !== "ok" || data.actor !== actorId || data.revision !== revision || !Array.isArray(data.rows) || typeof data.more !== "boolean" || data.rows.length > 24 || data.rows.some((row: Invitation) => !row || typeof row.invitation_id !== "string" || typeof row.created_at !== "string" || typeof row.state !== "string")) throw new Error("status");
        setInvitations(data.rows);
        setInvitationMore(data.more);
        setInvitationLoading(false);
      }).catch(() => { if (alive && !concealedRef.current) { setInvitations([]); setInvitationMore(false); setInvitationLoading(false); setMessage("Invitation status changed or is unavailable. Reload to review this Hangout."); pauseManagement(); setLocked(true); } });
    return () => { alive = false; };
  }, [role, id, actorId, revision, locked, identityHidden, pauseManagement, invitationPage]);
  function nextInvitations() {
    const last = invitations.at(-1);
    if (!last || !invitationMore || invitationLoading || locked) return;
    invitationCursors.current[invitationPage + 1] = { time: last.created_at, id: last.invitation_id };
    setInvitationPage(invitationPage + 1);
  }
  function invite(recipient: string) {
    if (locked || invitationLoading || frozenInvite) return;
    if (!window.confirm("Invite this joined participant to co-host? They receive a request and gain management access only if they accept.")) return;
    const intent = { recipient, requestId: crypto.randomUUID(), revision };
    setFrozenInvite(intent);
    setMessage("");
    start(async () => {
      try {
        const response = await fetch("/api/cohost", { method: "POST", cache: "no-store", credentials: "same-origin", headers: { "content-type": "application/json", "x-pals-cohost-actor": actorId }, body: JSON.stringify({ action: "invite", hangout: id, recipient: intent.recipient, requestId: intent.requestId, revision: intent.revision }) });
        const data = await response.json();
        if (data.kind === "denied") { deny(); return; }
        if (data.kind === "saved" && data.actor === actorId) { setFrozenInvite(null); pauseManagement(); setLocked(true); setMessage("Invitation sent. The Hangout is refreshing."); router.refresh(); return; }
        setMessage(data.kind === "stale" ? "This Hangout changed. Reload and review it before inviting." : "The invitation response is uncertain. Reload and check invitation status before any retry.");
      } catch { setMessage("The invitation response is uncertain. Reload and check invitation status before any retry."); }
      pauseManagement(); setLocked(true);
    });
  }
  function withdraw(invitation: string) {
    if (!window.confirm("Withdraw this co-host invitation?")) return;
    pauseManagement(); setLocked(true);
    start(async () => {
      try {
        const response = await fetch("/api/cohost", { method: "POST", cache: "no-store", credentials: "same-origin", headers: { "content-type": "application/json", "x-pals-cohost-actor": actorId }, body: JSON.stringify({ action: "withdraw", invitation, revision }) });
        const data = await response.json();
        if (data.kind === "denied") { deny(); return; }
        setMessage(data.kind === "saved" ? "Invitation withdrawn. The Hangout is refreshing." : "Invitation status may have changed. Reload and review it.");
        if (data.kind === "saved") router.refresh();
      } catch { setMessage("Invitation status is uncertain. Reload and review it."); }
    });
  }
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
          hidePrivate();
          setSensitiveHidden(true);
          setRoster([]);
          setAssignments([]);
          pauseManagement();
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
        hidePrivate();
        setSensitiveHidden(true);
        setRoster([]);
        setAssignments([]);
        pauseManagement();
        setLocked(true);
        setMessage("The list is unavailable. Reload before managing people.");
      } finally {
        setLoading(null);
      }
    });
  }
  function act(intent: ManagementIntent, target?: string) {
    const prompts: Record<ManagementIntent, string> = {
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
    pauseManagement();
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
          hidePrivate();
          setSensitiveHidden(true);
          setRoster([]);
          setAssignments([]);
        }
        setMessage(result.message);
        if (result.kind === "saved") router.refresh();
      } catch {
        hidePrivate();
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
    <section className="pals-detail-attending" aria-label="Pals attending">
      {!sensitiveHidden ? (
        <>
          {roster.some(
            (row) => row.role_label === "host" || row.role_label === "cohost",
          ) && (
            <div
              className="pals-detail-role-preview"
              aria-label="Hangout hosts"
            >
              {roster
                .filter(
                  (row) =>
                    row.role_label === "host" || row.role_label === "cohost",
                )
                .map((row) => (
                  <ParticipantIdentity
                    key={row.account_id}
                    accountId={row.account_id}
                    actorId={actorId}
                    hangoutId={id}
                    role={row.role_label}
                    identity={visibleIdentities[row.account_id]}
                  />
                ))}
            </div>
          )}
          <h2 className="pals-detail-attending-heading">Pals attending</h2>
          {visibleAttendees.length > 0 && (
            <div
              className="pals-detail-attending-preview"
              aria-label="Visible attendee profiles"
            >
              {visibleAttendees.slice(0, 6).map((row) => (
                <ParticipantIdentity
                  key={row.account_id}
                  accountId={row.account_id}
                  actorId={actorId}
                  hangoutId={id}
                  role={row.role_label}
                  identity={visibleIdentities[row.account_id]}
                  compact
                />
              ))}
            </div>
          )}
          <details className="pals-detail-attending-disclosure">
            <summary>
              <span className="pals-detail-attending-count">
                {visibleAttendees.length
                  ? `${visibleAttendees.length} attendee${visibleAttendees.length === 1 ? "" : "s"} shown${rosterMore ? "; more may be available" : ""}`
                  : "No attendees visible"}
              </span>
              <span
                className="pals-detail-attending-chevron"
                aria-hidden="true"
              >
                ›
              </span>
            </summary>
            <div className="pals-detail-management-panel">
              {role && (
                <section
                  className="saved-management"
                  aria-labelledby="manage-title"
                >
                  <h2 id="manage-title">Manage this Hangout</h2>
                  <p className="help">
                    {locked
                      ? "Management is paused until you reload and review this Hangout."
                      : role === "host"
                        ? "You can edit, invite co-hosts, remove attendees, or cancel."
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
                          <ParticipantIdentity
                            accountId={row.account_id}
                            actorId={actorId}
                            hangoutId={id}
                            role={row.role_label}
                            identity={visibleIdentities[row.account_id]}
                          />
                          <span className="saved-id">{row.account_id}</span>
                          {role === "host" &&
                            row.role_label === "participant" && (
                              <button
                                className="text-button"
                                disabled={pending || locked || invitationLoading || invitations.some((item) => item.recipient_id === row.account_id && item.state === "pending")}
                                onClick={() => invite(row.account_id)}
                              >
                                {invitations.some((item) => item.recipient_id === row.account_id && item.state === "pending") ? "Invitation pending" : "Invite co-host"}
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
                    This list shows currently visible joined members. A name or
                    photo appears only when that person currently shares it
                    through People.
                  </p>
                </section>
              ) : (
                <p className="saved-action-note">
                  People are hidden until you reload and review this Hangout.
                </p>
              )}
              {role === "host" && !sensitiveHidden && !identityHidden && (
                <section className="saved-management" aria-label="Co-host invitations">
                  <h2>Co-host invitations</h2>
                  {invitationLoading ? <p>Loading invitations…</p> : invitations.length ? (
                    <ul className="saved-roster">{invitations.map((item) => (
                      <li key={item.invitation_id}>
                        <span>{item.recipient_id ? `Participant ${item.recipient_id}` : "Unavailable participant"}: {item.state}</span>
                        {item.state === "pending" && <button className="text-button" disabled={pending || locked} onClick={() => withdraw(item.invitation_id)}>Withdraw invitation</button>}
                      </li>
                    ))}</ul>
                  ) : <p>No recent co-host invitations.</p>}
                  <div className="saved-management-actions">
                    {invitationPage > 0 && <button className="quiet-button" disabled={invitationLoading || locked} onClick={() => setInvitationPage(0)}>Start over</button>}
                    {invitationPage > 0 && <button className="quiet-button" disabled={invitationLoading || locked} onClick={() => setInvitationPage(invitationPage - 1)}>Previous</button>}
                    {invitationMore && <button className="quiet-button" disabled={invitationLoading || locked} onClick={nextInvitations}>Next invitations</button>}
                  </div>
                </section>
              )}
              {role === "host" && !sensitiveHidden && (
                <section
                  className="saved-management"
                  aria-labelledby="assignment-title"
                >
                  <h2 id="assignment-title">Co-host assignments</h2>
                  <p className="help">
                    This host-only list includes retained assignments for people
                    who are currently not ready. Removing an assignment revokes
                    powers if their access returns; it does not remove them from
                    the Hangout.
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
                      {loading === "assignments"
                        ? "Loading…"
                        : "Show more assignments"}
                    </button>
                  )}
                </section>
              )}
            </div>
          </details>
        </>
      ) : (
        <p className="saved-action-note">
          People are hidden until you reload and review this Hangout.
        </p>
      )}
    </section>
  );
}

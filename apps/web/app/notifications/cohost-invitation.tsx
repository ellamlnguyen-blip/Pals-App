"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AUTH_TRANSITION_CHANNEL, AUTH_TRANSITION_EVENT } from "../auth-transition";

type Invitation = { invitation_id: string; hangout_id: string; state: string; revision: number };
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

/** Mount only for an authorized cohost_invitation notification row. */
export function CohostInvitation({ actor, invitationId, hangoutId }: { actor: string; invitationId: string; hangoutId: string }) {
  const [item, setItem] = useState<Invitation | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "saving" | "unavailable" | "uncertain">("loading");
  const [message, setMessage] = useState("");
  const ticket = useRef(0);
  const masked = useRef(false);
  useEffect(() => {
    if (masked.current) return;
    const started = ++ticket.current;
    const current = () => !masked.current && ticket.current === started && !document.hidden;
    const mask = () => { masked.current = true; ticket.current++; setItem(null); setMessage(""); setPhase("unavailable"); };
    const visibility = () => { if (document.hidden) mask(); };
    window.addEventListener(AUTH_TRANSITION_EVENT, mask);
    window.addEventListener("pagehide", mask);
    document.addEventListener("visibilitychange", visibility);
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL); channel.onmessage = mask; } catch { /* local transition still masks */ }
    if (!uuid.test(actor) || !uuid.test(invitationId) || !uuid.test(hangoutId)) mask();
    else fetch(`/api/cohost?invitation=${invitationId}`, { cache: "no-store", credentials: "same-origin", headers: { "x-pals-cohost-actor": actor } })
      .then(async (response) => {
        const data = await response.json();
        if (!current()) return;
        const row = data.invitation;
        if (!response.ok || data.kind !== "ok" || data.actor !== actor || row?.invitation_id !== invitationId || row?.hangout_id !== hangoutId || !Number.isSafeInteger(row.revision)) throw new Error("invalid");
        setItem(row); setPhase("ready");
      }).catch(() => { if (current()) mask(); });
    return () => { ticket.current++; window.removeEventListener(AUTH_TRANSITION_EVENT, mask); window.removeEventListener("pagehide", mask); document.removeEventListener("visibilitychange", visibility); channel?.close(); };
  }, [actor, invitationId, hangoutId]);
  async function respond(accept: boolean) {
    if (!item || item.state !== "pending" || phase !== "ready" || masked.current || document.hidden) return;
    const started = ticket.current;
    const current = () => !masked.current && ticket.current === started && !document.hidden;
    const viewedRevision = item.revision;
    setPhase("saving"); setMessage("");
    let outcome: string | null = null;
    try {
      const response = await fetch("/api/cohost", { method: "POST", cache: "no-store", credentials: "same-origin", headers: { "content-type": "application/json", "x-pals-cohost-actor": actor }, body: JSON.stringify({ action: accept ? "accept" : "decline", invitation: invitationId, revision: viewedRevision }) });
      const data = await response.json();
      if (!current()) return;
      outcome = data.kind;
    } catch { /* A lost response does not tell us whether the write committed. */ }
    if (!current()) return;
    // Responses are not idempotent. Always inspect exact own state after an attempt.
    try {
      const check = await fetch(`/api/cohost?invitation=${invitationId}`, { cache: "no-store", credentials: "same-origin", headers: { "x-pals-cohost-actor": actor } });
      const fresh = await check.json();
      if (!current()) return;
      if (!check.ok || fresh.kind !== "ok" || fresh.actor !== actor || fresh.invitation?.invitation_id !== invitationId || fresh.invitation?.hangout_id !== hangoutId) { setItem(null); setPhase("unavailable"); return; }
      setItem(fresh.invitation);
      if (fresh.invitation.state === (accept ? "accepted" : "declined")) { setPhase("ready"); setMessage(accept ? "Co-host invitation accepted." : "Co-host invitation declined."); return; }
      if (fresh.invitation.state !== "pending") { setPhase("ready"); setMessage("This invitation changed. Review its current status."); return; }
      setPhase("uncertain"); setMessage(outcome === "stale" ? "This Hangout changed. Reload and review it before responding." : "The response is uncertain. Reload to check this invitation before acting again.");
    } catch { if (current()) { setPhase("uncertain"); setMessage("The response is uncertain. Reload to check this invitation before acting again."); } }
  }
  return <div className="saved-action-note" aria-live="polite">
    {phase === "loading" && <p>Checking co-host invitation…</p>}
    {phase === "unavailable" && <p>This invitation is unavailable.</p>}
    {phase === "saving" && <p>Saving your response…</p>}
    {item && phase !== "unavailable" && <>
      <p>Co-host invitation: {item.state === "pending" ? "Awaiting your response" : item.state}.</p>
      {item.state === "pending" && phase === "ready" && <div className="saved-management-actions"><button className="button" onClick={() => respond(true)}>Accept</button><button className="quiet-button" onClick={() => respond(false)}>Decline</button></div>}
      <Link href={`/hangouts/saved/${hangoutId}`}>Open Hangout</Link>
    </>}
    {message && <p role="status">{message}</p>}
  </div>;
}

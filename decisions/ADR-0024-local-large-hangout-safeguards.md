# ADR-0024 — Disposable-local large-Hangout safeguards

Status: Accepted — disposable-local TASK-020 only; explicit user acceptance recorded 2026-09-25
Date: 2026-09-25
Task: TASK-020

## Context

`SECURITY_AND_SAFETY.md` requires threshold awareness, host warning, close-joining control, moderation review hooks and ranking dampening. ADR-0004/0010 preserve open-by-default joining with no required capacity. No accepted source sets a numeric threshold, counting rule or dampening order. The saved map currently orders by start time and ID before a 100-result viewport limit. ADR-0019 permits only submitted safety reports in its audited operator queue. TASK-010's co-host policy is accepted but its implementation remains separately owned and undispatched.

## Proposed decision

### Size awareness and host control

Use **25 currently joined membership rows, including the host**, as the initial local threshold. This is a provisional product choice, not a validated safety boundary or a claim that smaller Hangouts are safe. Count joined rows regardless of current readiness; exclude left/removed rows and do not use attendance answers, message activity, location or historical peak membership. The source is planned participation, never proof of physical attendance.

A live-ready authorized host of a published, non-disabled Hangout may read a coarse `large` boolean derived from this count. No new exact count, peer identity or readiness information is exposed. This intentionally permits the host to learn that the retained joined population is at least 25 even where some roster identities are not visible. Ordinary viewers receive no authoritative hidden-member size flag.

On the saved detail, show the current host a warning while `large` is true: “This Hangout has a large group. Check that the meeting place works for everyone. You can close joining while you coordinate.” Show current open/closed state and a voluntary close/reopen control using existing host authority and expected revision. Crossing the threshold never closes joining, removes anyone or blocks a new join. Closed joining preserves current members' existing access. Dropping below 25 clears the current warning on the next authorized refresh; no background push or acknowledgement record is required. Do not imply live updates or guaranteed delivery to a host who never opens the page.

Recheck caller authority in the backend. Hide protected host controls on denied or uncertain access. For a stale or lost write response, refresh authoritative state before claiming success or allowing another desired-state action; never blindly toggle. No co-host role, cancellation UI, removal UI or broader TASK-010 lifecycle implementation is included. Host-only here describes TASK-020's UI on the current host-only implementation; it does not narrow Accepted ADR-0012 or revoke its co-host open/close authority. If TASK-010 is integrated before a stage dispatch, reconcile the narrower contract with its reviewed authority and controls instead of replacing or restricting them.

### Private review hook, not a moderation workflow

Add one private server-authored signal per Hangout and threshold-policy version, written atomically on the first newly admitted join that observes a count at or above 25 while the safeguard gate is enabled. A same-membership replay creates none. Concurrent joins and leave/rejoin cycles cannot duplicate it. A pre-existing above-threshold Hangout is warned by its current derived size; gate enablement alone does not backfill a signal. Its next genuine admitted join may create the missing signal. Do not infer a historic crossing time.

Allowlist the signal fields: Hangout UUID, policy version, threshold value and server observation time. No exact observed count, member/host IDs, text, place, coordinates, attendance answer or allegation is copied. Retain it privately after the size falls, cancellation or moderation disable; it grants no source access and is cleared by the full disposable database reset. There is no client or platform-role table grant, student reader, operator queue/detail, notification, PostHog event, automatic report or sanction.

This is an **unconsumed review hook**. It does not provide review, staffing or emergency response and does not complete the hosted review requirement. A separately accepted task must define its consumer, audited operator access, retention and response policy before any hosted use; TASK-021 must treat that as an unresolved launch dependency. ADR-0019's report-only queue and exact report-to-sanction binding remain unchanged.

### Discovery dampening without hidden-member disclosure

For saved-map discovery only, derive a separate viewer-relative large class using **only the currently ready joined roster IDs already readable by that viewer under source RLS and block rules**. No hidden roster member may affect that viewer's class/order. This can differ from the host's authoritative warning and private signal. Return no extra member IDs or aggregate count to discovery clients.

Apply existing bounds/time/join-state filters and full source authorization first. Then order candidates by viewer-relative large class (under 25 first), start time ascending and Hangout ID ascending, **before** the 101-row truncation probe/100-result display limit. This deliberately gives smaller groups priority within the user's selected map/time area; it is not a capacity limit or general popularity score. Large Hangouts remain eligible and may fill the viewport when fewer small ones match. Change list/truncation copy so it no longer claims pure start-time ordering. Map marker styling/clustering does not advertise a large badge or change prominence by attendee count. Calendar remains chronological and unchanged. Friend/personalized ranking is deferred.

Use a caller-bound database projection with explicit public-field allowlist and live authorization; never use a service-role web reader. Test ordering with more than 100 candidates so client-side reshuffling of a previously truncated set cannot masquerade as dampening. Test blocked/unready/cross-campus/disabled rows and hidden-member changes for absence of ranking disclosure. The direct public table remains source-authorized; this task does not deny existing lawful source reads just because the saved map has a preferred order.

### Gate, concurrency and local boundary

Use committed additive migrations and a separate private safeguard gate defaulting false, with no client grants. Gate-off denies the new host-size reader, emits no signals, and preserves existing saved discovery ordering and all existing source behavior. The discovery projection must have an explicit original-order gate-off path preserving the current RLS-filtered bounds/time/join-state query, 101-row probe, start-time/ID order and live revalidation before response. A's contract must reconcile its projection with the existing two-query revalidation rather than dropping that privacy guard. Host close/reopen uses the existing Hangout gate/authority independently of the new gate because that power is already accepted.

New join-side signal work follows the existing shared social lock, Hangout parent lock, source authorization and gate ordering. Specify and independently review the exact lock order in the narrower backend contract before implementation; preserve block/moderation/readiness rechecks after waits, membership idempotence and notification behavior. A committed gate disable before the safeguard gate check suppresses signal work without vetoing an otherwise authorized join. Direct REST, legacy RPCs and stronger isolation must not bypass privacy or write guards.

Acceptance authorizes bounded implementation and temporary enablement of only required gates in **disposable local Supabase with synthetic data**, including authenticated desktop/phone QA. Restore all gates false, reset all fixtures and stop owned services afterward. No hosted migration, gate enablement, deployment, live students, external analytics or persistent test data is authorized.

## Alternatives and tradeoffs

- An automatic cap/closure is simpler operationally but conflicts with casual, no-default-capacity behavior; it is not proposed.
- A size-triggered moderation queue could operationalize review but expands ADR-0019 operator access and requires separate decisions. This proposal deliberately implements only the private hook and records the hosted gap.
- Reordering only the first 100 chronological rows is smaller work but lets early large Hangouts exclude later small ones. The proposed order applies before truncation.
- Using the authoritative count for all discovery ordering would disclose hidden-member changes. Viewer-relative size protects that boundary at the cost of different rankings for different viewers.

## Acceptance

After the independently reviewed proposal and task contract were published on remote-verified canonical main `768931fb947e6be08c7a7b5f5b99fded0fe4f20f`, the coordinator asked the user explicitly whether to accept this ADR for disposable-local implementation and temporary test gates. The user replied “accept” on 2026-09-25. The decision above is accepted unchanged for that bounded scope. The narrower stage A contract still requires independent review and publication before implementation dispatch. This acceptance does not authorize hosted migration, deployment, live students, persistent gate enablement or an operator consumer for the private hook.

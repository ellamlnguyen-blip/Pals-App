# ADR-0019 — Disposable-local moderation authority and audit
Status: Accepted — disposable-local TASK-017 only
Date: 2026-09-23; accepted 2026-09-24

## Context

Accepted ADR-0006 requires distinct platform operators, report review, suspension/ban, Hangout disabling and an audit trail. Accepted ADR-0018 stores private allegations but deliberately grants no moderator reader, case state or sanction authority. TASK-017 must define that boundary before any privileged migration or console is built. All existing feature gates remain disabled by default, and this proposal authorizes no hosted use.

## Proposed decision

### Operator identity and scope

An operator is a live, active account with an explicit `public.platform_roles` row of `moderator` or `admin`. The database verifies that row and account state on every privileged read and write; a JWT claim, URL, browser state or app route is never authority. The initial bootstrap/assignment of platform roles is a separately controlled administrative operation outside the client console. The role does not grant blanket table, Storage, message, profile-photo or exact-location access. A suspended or banned operator loses console access. Operators may review reports across campuses for the initial UNC operation. New actions record the subject's authoritative campus when available; existing reports must not be assigned a guessed historical campus. No operator may moderate their own account or their own Hangout; no operator may act on an account currently holding a platform role through this console.

Conflict checks apply to the entire review workflow. A report filed by the operator, targeting that operator, or targeting a Hangout they host is omitted from their queue and denied by exact-ID detail, case and action RPCs. Reports targeting any platform operator are unavailable for sanctions in this console and require a separate escalation policy. Recheck current host/role evidence when acting, including if it changed since queue display.

### Review and minimum evidence

The only initial queue is submitted safety reports. A bounded, newest-first page exposes report ID/time, type, category, target ID, reporter ID and case state to an authorized operator. Every queue read and detail opening records an access event; detail returns its plain-text allegation and minimum current target context needed to decide an action. It does not silently fetch chat, DM text, peer photos, private meeting instructions, precise location or full historical source records. Report allegations are unverified claims. Reporters and targets receive no report history or case status through student APIs. The console never places narrative or target identifiers in URL query strings, browser storage, analytics or client logs. All sensitive responses are uncached and require a fresh server-side operator check. A read cannot be considered private merely because a Next.js page is hidden.

The queue field allowlist is report ID, submission time, target type/ID, reporter ID, category and case state; provenance is detail-only. Detail adds narrative, provenance kind/reference ID, case note/disposition, and only current target state: account status and current campus ID for a user, or Hangout lifecycle/disabled state and campus ID for a Hangout. No name, email, bio, photo, public description/place, private instructions, message or location is projected. A deleted or unavailable target is labeled unavailable without resolving another source; the allegation remains readable by an unconflicted authorized operator. The queue reads and detail access are audited even when no case mutation follows.

### Cases and actions

Each report has one internal case state: `open`, `in_review` or `closed`; closing requires a disposition of `no_action`, `action_taken` or `duplicate` and a bounded operator note. A later report about the same target remains a separate allegation. Operators can annotate and close/reopen a case; these are audited state transitions, not a public finding. Moderators and admins may suspend an active nonoperator account or disable a Hangout, with a required reason. Only admins may ban a nonoperator account or lift a suspension/ban. Disabling a Hangout is a distinct moderation state; it must revoke future discovery, joining, private instructions and chat reads/sends through database authorization, while preserving private evidence and host ownership. It does not erase reports or imply physical separation. A suspended/banned account loses all student feature access except its existing own-status boundary. Reinstatement does not restore removed participation, prior relationships or disabled Hangouts. No automatic punishment, report-triggered sanction, role assignment, bulk action or notification is added.

`no_action` means an operator closed without sanction. `duplicate` requires a referenced existing report about the same target; it does not merge or erase either allegation. `action_taken` requires a linked, committed sanction from this same case and cannot be selected in Stage A before enforcement exists. A sanction and its `action_taken` closure commit atomically, with one audit chain. Reopening clears the prior disposition but retains its audit history; annotation alone never sanctions.

The duplicate reference must itself be reviewable by the same operator under the current conflict and gate checks; unknown or inaccessible report IDs receive one neutral denial. Both target equality and reference authorization are checked inside the transition transaction. A duplicate link does not disclose the referenced allegation to student clients.

An account sanction may be linked only to a case whose stored target is that exact user ID. A Hangout disable may be linked only to a case whose stored target is that exact Hangout ID. A Hangout allegation cannot be used to sanction its host through an inferred ID; the reporter can instead use ADR-0018's `hangout_host` mode, which creates a user-target report with server-resolved host ID. Direct RPCs validate this exact binding transactionally and deny unrelated subjects even when the operator has authority over both.

When a Hangout is disabled, all student public/detail/roster reads, discovery, calendar and notification destinations, join/leave, host/co-host management, edits, cancellation, private instructions and group-chat reads/sends deny or project a neutral unavailable state. No host override remains. The existing safety-only own retained Hangout ID/state recovery and private report submission remain available under their accepted gates and evidence rules, without exposing the disabled Hangout's details. The operator detail projection above remains available only under the moderation gate. Disabled is separate from ADR-0010's terminal cancellation; this increment has no client or operator re-enable action. Notifications already recorded are masked through their source authorization rather than deleted.

Every privileged report queue/detail read and every case or enforcement mutation appends an immutable, server-authored audit record containing operator ID, action, subject, server time, reason where applicable, request ID and previous/new state. Actions are transactional and idempotent by operator-scoped request ID; a same-key changed payload fails. Audit rows have no client table grants. A failed/denied attempt is not allowed to leak target existence; local security logs may record failure without sensitive payload. A moderation feature gate starts false and blocks all console readers and writers while leaving existing student block/report enforcement intact. Console actions require READ COMMITTED, lock/recheck relevant account, Hangout, gate and role evidence after contention, and fail closed at stronger isolation. Enforcement must cover direct REST, embeds and old RPC paths, not just the UI.

A queue-page audit entry uses `queue_read` as its action and records the bounded returned report IDs and count rather than pretending one report was the subject; a detail audit entry names its single report ID. Both use server-issued request IDs and contain no allegation narrative. Stage A tests that each successful page/detail response has its corresponding committed audit entry.

Local account deletion must not silently cascade away a report, case or audit entry. Stage A changes the existing reporter foreign-key deletion behavior to restrict while reports exist, uses restrictive case-to-report references, and stores audit actor/subject IDs as immutable UUID values without cascading foreign keys. There is no routine moderation delete API. A full disposable database reset clears fixtures at task cleanup; a production deletion/redaction/legal-hold policy remains a hosted prerequisite.

### Local boundary and hosted prerequisite

TASK-017 uses disposable local fixtures only. Local reports, cases, audit and moderation evidence are cleared at cleanup; gates return to false. A production retention/deletion schedule, legal hold, appeal and escalation process, operator onboarding/MFA and staffed response agreement must be decided and tested before hosted migration or live use. This ADR does not claim that a local console completes those operational launch requirements.

## Consequences

The admin console needs explicit audited database functions and changes to existing authorization paths for disabled Hangouts. A simple service-role web proxy or UI-only role check cannot meet this decision. The implementation must be split into independently reviewed backend and UI stages because sanctions affect multiple existing source readers and writers.

## Alternatives considered

- A read-only report list would leave the accepted suspension/ban and Hangout-disable requirements unmet.
- Giving the admin app a service-role key would bypass the caller-bound authorization and create an unaudited broad reader.
- Automatically sanctioning on report submission would treat allegations as findings.
- Copying full messages, photos or exact locations into each report would increase sensitive retention without a defined review need.

## Acceptance

After the independently reviewed proposal and contract were published on remote-verified canonical main `fd7665614be99b4ed3b16703fff85dcef8c49bb2`, the coordinator asked the user explicitly whether to accept the linked ADR-0019 for disposable-local TASK-017 implementation, with “Accept as written,” “Request changes,” and “Decline” as choices. The user replied “ok” on 2026-09-24. In that direct response to the acceptance question, “ok” accepts this proposal as written for its stated local scope. Stage A still requires its own reviewed, published contract. No hosted operation, production retention policy or staffed response is accepted.

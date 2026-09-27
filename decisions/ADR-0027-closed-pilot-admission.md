# ADR-0027 — Closed-pilot admission and capability enforcement

Status: **Proposed — not accepted; implementation blocked**
Date: 2026-09-27
Parent: TASK-021 (incomplete)
Source baseline: canonical main `7f2bea3dc52475748b482490a161f55b9e7789f9`.

## Context and decision requested

The user selected a closed, invited, verified-UNC pilot with onboarding, core Hangout hosting/joining/chat and block/report/moderation. ADR-0026 records that product choice separately. Selecting that scope does not accept an admission mechanism, hosted operations or this ADR. This proposal depends on Accepted ADR-0026 and preserves its exact scope; resolve any conflict against its published text before implementation.

**Proposed choice:** use a private, default-deny roster keyed by the actual Supabase Auth account UUID, with explicit active/revoked state, and enforce it in database authorization and the app. Invitation means trusted activation of that account; an email, URL, signup metadata or JWT claim alone grants nothing. Accepting this choice permits the separately reviewed local implementation contract, not a hosted pilot launch.

Suggested user choice after independent review: “Accept the private account admission roster and server/database capability checks for local implementation,” or “Request a different admission approach.” Publishing this document as Proposed is not acceptance.

## Proposed admission boundary

A committed migration creates a private admission relation referencing the provisioned account UUID, explicit active/revoked state, revision and server timestamps. Absence, revoked state, absent policy configuration or disabled pilot availability denies ordinary pilot access. No client table access, arbitrary-subject admission RPC, roster listing, email lookup or existence oracle. Client roles cannot activate themselves, alter policy, impersonate an actor or mint operator authority. Fixed-search-path internal helpers derive callers from `auth.uid()` and read current authoritative state.

The private policy singleton defaults pilot availability **off**. Turning it on requires active roster membership plus existing active-account, live exact-domain UNC verification, active campus, complete required profile and existing owned primary-photo checks. Turning it off shuts ordinary pilot access; it never falls back to all verified UNC users. No environment variable, hidden link or disabled admission check opens access. A future public/nonpilot release requires a separately accepted mode/contract; this task supplies no production bypass. Existing disposable-local nonpilot regression suites provision synthetic admissions and explicit temporary capability settings in their isolated fixture setup, including a shutdown-denial case; they do not opt out of admission enforcement. Fixture teardown restores defaults and removes all synthetic records.

## Invited onboarding without a readiness deadlock

1. The prospective invitee creates/signs into an Auth account using the approved UNC email verification flow. Signup may produce an unadmitted account, but never student-feature access. A nonadmitted signed-in account receives only its neutral access status, verification/sign-out guidance and invite-pending explanation, without peer data or roster status about anyone else.
2. A trusted bootstrap/admission operator resolves the verified account UUID through a controlled nonstudent workflow, checks current approved UNC verification and records activation. This must not depend on completed profile/photo readiness. No student email-to-ID resolver or invitation token is introduced.
3. With pilot availability on, an active admitted account may read/edit its own required onboarding draft and perform the existing primary-photo upload/assignment/replacement cleanup lifecycle. It cannot discover Hangouts until profile/photo readiness is complete. Email verification itself remains an Auth operation; admission is neither verification nor proof of real identity.
4. `get_access_state()` distinguishes admitted-but-unverified, admitted onboarding and ready from neutral not-admitted/unavailable state. The app's typed state handling, callbacks, redirects, pages and actions must handle these states without loops. No profile/photo write requires already-complete readiness.

The precise Auth signup/provider restrictions, callback origin and real UNC delivery need the separately approved target package. Disable unsupported providers and restrict signup to the controlled invitation process where supported as defense in depth; leaked signup links, stale accounts or provider misconfiguration must still fail database admission checks. This proposal introduces no account precreation, mailbox send or hosted Auth configuration.

## Live authorization, peers and revocation

`get_access_state()` currently admits any ready UNC account; `private.ready_subject_campus()` independently mirrors readiness for peer projections. Both must require current admission. Audit every grant, RLS policy, security-definer RPC, owner draft/Storage policy, photo issuance/stream route and permission helper rather than assuming those two replacements cover everything. Ordinary owner profile/Storage access needs admitted onboarding eligibility; accounts may retain only their own neutral status when denied. Verification helpers must keep their existing UNC meaning; do not redefine “verified” as “admitted.”

Ready admitted callers receive only currently admitted eligible subjects in roster/text/author projections. Revoke known-ID detail, embedded REST rows, list/cursor results and private instructions/chat consistently. No new peer photo access. A host's ordinary Hangout visibility must also require current host admission/readiness so a revoked host's Hangout cannot expose that host, place or coordination to students. Preserve retained rows privately; revocation does not transfer ownership, delete evidence, infer leave/block, send notifications or restore relationships on readmission.

Roster revocation and shutdown affect existing sessions without waiting for JWT expiry. Changing email outside approved UNC evidence immediately loses verification; changing a verified account email does not transfer its UUID admission to another account. Reactivation requires an explicit trusted audited action; a new Auth account at the same email starts unadmitted. Suspension/ban and campus/photo/readiness loss remain independent denial conditions. No client cache or refreshed token can override live denial.

Mutations extend existing READ COMMITTED, shared social/Hangout lock order and fresh reauthorization to admission/policy evidence. Trusted activation/revocation uses the same serialization boundary and locks those evidence rows consistently; missing-roster checks must be serialized too, not protected by a nonexistent row lock. Hold applicable admission/policy locks through final authorization and commit. A revocation committed first denies; a mutation committed first may stand, but later reads deny. Already in-flight snapshot reads may finish under existing documented semantics; do not promise recall of delivered data. Test races, retries and shutdown; stronger isolation fails closed where existing source operations require it.

Preserve existing narrowly authorized safety recovery after readiness/admission loss: active accounts with caller-owned retained evidence may recover only own retained IDs/state, manage own existing outbound block direction and submit evidence-qualified private reports/exact receipt retries under existing safety rules. Unadmitted accounts without evidence gain no target access. Shutdown keeps this narrow safety recovery and approved operator case handling available through their independent gates; it shuts ordinary onboarding/discovery/coordination. Suspended/banned accounts remain denied as specified today. These exceptions disclose no source title, host lookup, roster, profile/photo, location or messages and grant no ordinary access. Existing blocks remain enforced regardless of deferred feature gates.

## Capability boundary

| Pilot capability | Enforcement requirement |
| --- | --- |
| Required owner identity/onboarding and primary photo | Admission-aware owner policy; primary replacement/cleanup retained; no peer photo delivery. |
| Campus Hangout map/discovery, create/edit/cancel, join/leave, host removal, open/close joining, participant-private instructions | Keep existing source authorization, moderation/block checks and unsupported-mode denial; require live admission. |
| Hangout chat and Hangout-only Chats entry | Keep source membership/readiness/admission checks. Decouple `/chats` from People and remove `DmInbox` in pilot mode; `lib/chat.ts` already uses Hangout access independently. |
| Block/report and moderation | Keep safety provenance/recovery and global reconciliation; retain ADR-0019 report-only audited operator authority and conflicts. |
| Calendar, People directory/opt-in, friendship, DM, notification inbox/preferences, attendance, extra-photo gallery, external analytics | Defer in pilot. Hide navigation and enforce route/action/API/database capability denial, including old RPCs, direct reads and known IDs. No Calendar/attendance inheritance from Hangout availability; no DM access through Chats. No new additional-photo reference assignments/gallery delivery; primary upload/replacement remains possible. |

Co-host is a UI-only deferral: hide/deny assignment pages, controls and application server-action entry points, while preserving existing backend roles, authorized role RPC behavior, invariants and safety. Any backend co-host policy change requires separate acceptance. Keep the reviewed co-host backend/invariants for dependency compatibility, with no assignment UI offered. Retained role authority follows its existing policy; no new pilot assignments are made by fixture/bootstrap procedures except explicit regression tests. This proposal does not revoke roles or delete records by hiding UI. Notification source helpers, global block reconciliation, moderation, private evidence and migration dependencies remain intact even when deferred delivery/capability gates are off. Keep external capture and the full large-Hangout safeguard bundle off under the accepted deferrals; maintain original authorized map ordering. No destructive migration pruning or new friend/ranking behavior.

Each deferred surface needs an explicit source inventory and gate mapping. Client/server presentation switches are defense in depth; the authoritative private capability configuration must deny disabled operations even if older feature gates are accidentally on. Retained cleanup needed for safety may operate internally, but must not revive client friendship/DM/inbox/attendance readers or writers. Extra-photo capability denial covers reference changes, gallery routes/actions and streamed slots; preserve privately retained objects and safe primary replacement/cleanup rather than accepting a destructive deletion policy.

## Trusted management and audit

Start with the smallest controlled privileged bootstrap/management procedure outside student clients; no new student-accessible admin console or broad application service-role proxy. The privileged credential remains server/operator-only and is never bundled or logged. The exact authorized bootstrap identity, target and role-assignment/MFA/recovery procedure are separate hosted policy gates. Local synthetic management exercises do not grant hosted authority.

Record every activation, revocation, reactivation and pilot/capability policy change in a private audit with authenticated trusted actor identity, account target where applicable, old/new state, reason and server time, atomically with the change. Preserve audit immutability/no client grants; deny anonymous actors and ambiguous shared-credential attribution. Trusted procedures must not provide a broad identity/profile/photo/message reader, self-admin grant or bypass of operator conflict/role rules. Admission manager and report moderator are separate authorities; admission alone grants no platform role and platform role alone grants no student admission. Audit actor provenance and bootstrap acceptance need independent security review before hosted use.

## Alternatives and consequences

Email allowlists alone confuse invitation with verification and may transfer access across accounts. Invite links/tokens require additional claim/replay/expiry machinery and do not replace live revocation. An environment-only switch or hidden navigation fails direct access checks. The account roster is deliberately small, but requires a trusted account-resolution/activation workflow and separate hosted operational ownership. Pilot downtime leaves narrow safety recovery available; operator response commitments remain unresolved. No numeric staffing, retention or photo URL policy is selected.

## Acceptance and implementation gates

Before implementation: Accepted ADR-0026 published; this ADR independently security-reviewed and explicitly accepted; the narrow TASK-021A contract independently reviewed and published on canonical main. Before hosted use: separate operating policies, exact target/origin/migration manifest/dependencies, provider/signup/callback/SMTP, app hosted-guard changes, role bootstrap/audit/MFA/recovery, photo bearer/cache, retention and controlled-test operations accepted and specifically authorized. TASK-021 remains incomplete. This proposal authorizes no runtime edit, hosted migration/configuration/gate/deployment, SMTP send, live user or launch.

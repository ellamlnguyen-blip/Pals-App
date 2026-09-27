# TASK-021 — Accepted pilot scope documentation handoff

Date: 2026-09-27
Status: docs increment independently reviewed, published and integrated; TASK-021 incomplete
Baseline: canonical main `7f2bea3dc52475748b482490a161f55b9e7789f9`
Branch: `agent/TASK-021-pilot-scope`
Worktree: `/private/tmp/pals-task021-pilot-scope`

## Outcome

Recorded the user's “then let's do the pilot scope” acceptance in ADR-0026 for a small nominated verified-UNC pilot before the later public MVP. Required onboarding fields/primary photo, campus-visible Hangout map/list/create/time/approximate location/join/leave, manual-refresh chat, host edit/cancel/close/removal and safety/report-only moderation/audit/enforcement remain. Calendar/People discovery/friendship/DM/notifications/co-host UI/attendance surveys/optional rich profile/extra photos/analytics are deferred from pilot exposure. ADR-0025 history/later public scope and all local code/backend safety remain preserved.

Updated authoritative MVP/current scope summaries, task/readiness/decision package, NOW/BACKLOG/CURRENT_STATE/CHANGELOG. Added bounded pilot preparation plan with source-audit coupling constraints, explicitly Proposed admission candidate and planned/unrun admission/deferred-route/privacy/gate/hosted verification. Minimal profile does not reduce existing required fields or primary photo. Invite-only pilot admission does not imply invite-only Hangout visibility.

## Verification and limits

- `git diff --check` passed for docs-only changes.
- New relative Markdown file links checked against repository files.
- No code, schema, runtime tests, hosted inspection/configuration/migration/deployment, gate, SMTP, analytics transport or DNS action performed. No current hosted state or green runtime claim.
- Admission mechanism/tester list, named human report handlers/coverage and hosted access/MFA/retention/recovery/photo bearer policy remain separately reviewed/unresolved. Admission candidate is Proposed and requires its own accepted ADR and reviewed bounded local contract before implementation.
- Deferred-route/API gates remain planning requirements. `/chats` People dependency/DM inbox, inherited Calendar/attendance access and optional photo exposure need bounded preparation; existing global-block/audit/helper schema and schedule integrity must be preserved.

## Independent review correction

Clarified the UI-only co-host deferral: hide/deny co-host management pages, promotion/demotion controls and application server-action entry points while preserving backend roles, authorized RPC behavior and safety checks. Removed co-host behavior from the general deferred-data/API/RPC deny matrix. Backend authorization changes require a separately accepted contract. Documentation whitespace check passed; no runtime action.

## Publication and remaining work

Reviewed task branch `origin/agent/TASK-021-pilot-scope` and canonical `origin/main` were independently remote-verified at `b141d9e8b0c328773b0fc7162f94cba30edcb17f` after standard non-force publication and fast-forward integration. This documentation receipt follows the verified integration. Do not mark TASK-021 complete or create a successor. Remaining gates: reviewed admission/capability contract and policy acceptance, accepted named safety owners/policies, exact target/migration/gate/app-guard/hosted authorization, actual controlled rehearsal/cleanup and independent evidence review.

Fresh independent Sol-medium review cleared corrected exact tip `febace262c455c6c780ab59e24e3e5e9e386ff54` with no remaining findings.

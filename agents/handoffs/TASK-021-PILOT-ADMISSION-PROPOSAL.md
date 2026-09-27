# TASK-021 — Pilot admission proposal handoff

Status: Independently reviewed and published Proposed design; explicit ADR acceptance pending
Date: 2026-09-27
Branch: `agent/TASK-021-pilot-admission-plan`
Baseline: canonical main `8e49922c5cb9d5331ca6c0b01fcf49c34541a6ae` supplied and checked out locally.

## Outcome

Drafted Proposed ADR-0027 and Proposed TASK-021A planning parent only. Independent-review corrections specify separate caller-bound admission-manager authority/actor audit and required A1 backend then A2 application split, each with separately reviewed published contract. User-selected pilot product scope is published separately in Accepted ADR-0026; no technical choice has been accepted here. Proposed private account-UUID admission roster, default-off pilot availability, live caller/subject/onboarding/Storage enforcement, capability gates, audited trusted management and narrow retained-evidence safety recovery. Co-host is explicitly UI/application-entry-only deferral; existing authorized backend role behavior remains unchanged.

Source findings: verified onboarding migration's `get_access_state()` accepts any ready UNC account; Hangout foundation independently mirrors readiness in `ready_subject_campus()`; identity foundation owner policies and verified-owner Storage need explicit admission audit. Global-block evidence lock helpers and retained safety/report exceptions need preservation. `/chats` currently depends on People and renders DmInbox while `lib/chat.ts` is independently Hangout-based. Calendar/navigation/attendance currently inherit Hangout availability. Deferred feature gates cannot be treated as migration-removal permission.

Explicit Proposed subject matrix retains current authorized former-nonhost-author chat body while masking identity, current host known retained state/assignment-ID projections, and independent report-only operator handling for active unadmitted operators during pilot shutdown; ordinary revoked-host source is hidden. These semantics are awaiting acceptance, not inferred from pilot selection.

## Evidence and limits

Read AGENTS/TASK-021, product principles, current authorization/data model/safety/messaging, ADR-0025/initial-decision boundaries and relevant identity/onboarding/Hangout/global-block SQL/application sources. Documents only; no runtime tests, code/schema change, fixture/gate write or current hosted verification. `git diff --check` and scope/status review are the draft validation. Rebased on published Accepted ADR-0026 and checked its pilot preparation plan; optional rich profile/extra-photo denial and UI-only co-host scope are included.

## Remaining gates

Coordinator: obtain fresh independent security review of exact draft tip; resolve findings; review/publish Proposed records and shared status without treating publication as acceptance; request the concise ADR-0027 technical choice. After explicit acceptance, independently review/publish final narrow contract before fresh local implementation dispatch. No push or integration performed by this draft agent; no task/main remote SHA claimed. Hosted operating policies, target manifest/app guards/providers/SMTP/rehearsal remain separate. Parent TASK-021 remains incomplete; no successor created.

Fresh independent Sol-medium security/contract review cleared exact corrected documentation tip `57748beb5c8a4766a1aeee4181b7627e5ed83189` with no remaining blocking findings. Publication does not accept this design.

## Publication receipts

Reviewed task branch `origin/agent/TASK-021-pilot-admission-plan` and canonical `origin/main` were independently remote-verified at `e52fda3b8ebcd5ca21aba603ca4f0bda1188f74c` after standard non-force publication and fast-forward integration. This documentation receipt follows that verified integration. ADR-0027 remains Proposed, narrower stage contracts remain required, and TASK-021 remains incomplete.

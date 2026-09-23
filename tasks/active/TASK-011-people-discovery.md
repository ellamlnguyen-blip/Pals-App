# TASK-011 — Local People discovery

Status: Planning reviewed and published; implementation blocked on explicit ADR-0013 acceptance
Date: 2026-09-22
Planning branch: `agent/TASK-011-planning`
Starting clean canonical main / freshly fetched origin/main: `b3011bc74adb46d01fd4b709520ecf5c3f8fa8a2`

## Goal and boundary
Plan and, only after acceptance, build an opt-in, same-campus, text-first People directory in disposable local development. This bounded increment is partial MVP People delivery: photos, recommendations, friendship, messaging and attendance context remain deferred, not complete.

## Prerequisites
- TASK-003 live identity/readiness and TASK-006 owner profiles are integrated. TASK-009 Calendar is complete locally. No TASK-010/ADR-0012 dependency; those remain pending and unaccepted.
- Publish this reviewed contract, Proposed ADR-0013, queue/status and planning handoff on main before any implementation dispatch. Publication is not acceptance. Record explicit acceptance of peer text fields, opt-in, People-only bilateral suppression and local block prerequisite before migrations or peer readers.
- Acceptance of ADR-0013 and this contract permits only these local stages. Coordinator writes/publishes a narrower contract for each fresh task agent; no agent inherits an unbounded whole-product assignment. Review A's handoff and independent security review, integrate and verify main, then dispatch B.
- Default-disabled Hangout gate, disposable-local-only boundary, private-location revocation, live readiness/campus enforcement and separate mock/saved Hangouts stay intact. Proposed separate People gate also defaults off. No hosted enablement, migration, deployment, restricted access or live students.

## Required reading
AGENTS.md; this contract and ADR-0013; NOW/BACKLOG/CURRENT_STATE; MVP/PRINCIPLES; ARCHITECTURE, AUTH, AUTHORIZATION, DATA_MODEL, SECURITY_AND_SAFETY, TESTING; UX USER_FLOWS, INFORMATION_ARCHITECTURE, SCREEN_INVENTORY, DESIGN_DIRECTION; Accepted ADRs 0006–0011 (especially owner-only ADR-0011 and local-only ADR-0010); pending TASK-010/ADR-0012 only to preserve independence. Read TASK-003/006 contracts/handoffs, existing identity/profile/photo migrations, live access helpers, profile/photo routes, local target guards and regression scripts. Read actual friendship/block implementation if it changes before dispatch; currently neither exists.

## Stages after explicit acceptance
1. **TASK-011A privacy and text-read backend**, planned branch `agent/TASK-011A-people-backend`: committed additive local migrations, gate, default-off preference, bounded caller-owned block relation/management and allowlisted text projections/search under exactly ADR-0013. This is an explicit limited prerequisite drawn forward from TASK-016; full reporting/blocking remains open. Shared types/validation and meaningful database/API/concurrency tests only; no UI, peer photo access, Hangout policy change or hosted operation. Fresh independent security review and main integration before B.
2. **TASK-011B People and privacy UI**, planned branch `agent/TASK-011B-people-ui`: ready-only People browse/search/filter/detail consuming reviewed APIs; owner opt-in preview/opt-out, honest local-only block confirmation, paginated outbound-ID unblock management and existing owner profile route. Keep opt-out and outbound unblock accessible to active owners who lost readiness under the accepted backend rules; opt-out also works while the People gate is disabled. Outbound block management uses full stable IDs with copy/select support and exact-ID confirmation, no cached names; explicitly record its local-only identification limitation. No friend/DM action placeholders that imply functionality. Update existing owner-only explanatory copy precisely: selected text is shared only after opt-in; all photos and excluded fields remain private. No new schema or permission. Before substantial UI read installed Leon Taste skill, inspect https://usepals.com/, inspect tokens/components and write desktop/phone interaction plan; verify keyboard and loading/empty/error/denied/stale-request states. Fresh security/design review and coordinator rendered inspection before integration.

Do not dispatch a peer-photo or global blocking stage under this contract. A subsequent accepted contract is required to complete deferred MVP People capabilities.

## Acceptance criteria for this bounded increment
- [ ] ADR-0013 explicitly accepted and published; stage contracts on main before dispatch; A reviewed/integrated before B.
- [ ] Existing/new users default private; opt-in shares only accepted fields, opt-out revokes direct and list reads, and readiness restoration behavior is honest. Raw owner profile/Storage readers stay unchanged.
- [ ] Same-campus live-ready viewer/subject and either-direction block checks apply to every exposed People query, known-ID request, filter and cursor. No hidden-subject count/options or incoming-block leak.
- [ ] Caller-owned block/unblock and active-owner privacy management work with safe retries, bounded outbound list, no forged actor/target escalation and no revival through concurrent mutations. UI explains People-only separation and unchanged Hangout access.
- [ ] Search/filter/pagination are bounded and deterministic; text-only detail and explicit opt-in preview match field projections; late responses do not replace newer search results. No friendship, DM, photos, attendance or popular-user ranking claim.
- [ ] Meaningful SQL, real caller-session HTTP/action and concurrency cases pass along with profile/photo and saved Hangout/Calendar regressions. Independent security review clear and desktop/phone/keyboard verification recorded.
- [ ] Data cleaned, both gates false, local services stopped; stage/task/main publication verified and handoffs/queue/CURRENT_STATE synchronized. Deferred features and hosted gates remain explicit.

## Verification matrix
Test anonymous, ready same-campus, self, cross-campus, incomplete/missing-primary, changed email, inactive campus, suspended/banned, forged admin/moderator, opted-in/out and either/both block directions. Exercise gate false/true, direct SQL actual roles, PostgREST RPC/tables/embeds, Storage, web routes/actions and malformed filters/cursors. Verify unchanged owner-only photos and excluded fields, nonready owner opt-out/unblock, active-owner opt-out with People gate disabled, full-ID unblock confirmation, mutual-block races, lost responses, hidden/nonexistent indistinguishability, readiness/gate changes while mutations wait, READ COMMITTED versus denied stronger isolation, post-commit revocation and cache headers. Do not equate setup with a privileged SQL connection to RLS verification.

Run `pnpm check`, two clean resets/lint through `pnpm db:verify`, and actual local Auth/HTTP/action/concurrency suites appropriate to each stage. Known pre-existing Next dev-helper `/signin` invariant and CI action-manifest failures remain separate BACKLOG maintenance; built-loopback suites can verify behavior with explicit limitations. No green-CI claim or out-of-scope repair. Planning-only validation is document consistency, scoped diff and independent review; no runtime/UI verification claim for this milestone.

## Ownership and handoff
Coordinator owns shared queue/CURRENT_STATE/CHANGELOG, acceptance evidence, narrower dispatch contracts, integration and remote receipts. Stage agents own assigned files and their handoff using agents/HANDOFF_TEMPLATE.md, then stop. Planning handoff: `agents/handoffs/TASK-011-CONTRACT.md`. TASK-010 remains pending. Follow current AGENTS.md automatic next-task policy only after the bounded parent task is complete; this proposed contract/blocked decision does not trigger a successor chat. Use GPT-6 Sol / medium at Standard speed (not Fast) for all implementation/review agents and subsequent task chats.

## Planning publication
Independent planning review resolved; planning branch and canonical main verified remotely at `9f52a39ac8b92ea082ad199b55ab766f671fd2f4`. No policy acceptance, implementation, migration or parent-task completion follows from this publication.

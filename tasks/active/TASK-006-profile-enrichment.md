# TASK-006 — Owner profile enrichment and photos

Status: Accepted for implementation; fresh implementation dispatch authorized
Date: 2026-09-22

## Goal
A verified, onboarded UNC owner can review/edit their profile, add optional personal details and manage a primary plus up to four additional private photos.

## Dependencies and decision gate
TASK-001/002 foundation and TASK-003 locally implemented identity/onboarding/photo permissions are prerequisites already on main. TASK-004 supplies the header entry point. No TASK-005 dependency: this task neither reads nor changes Hangout data, participation or eligibility. ADR-0010 remains Proposed. TASK-003 hosted HTTPS callback and real UNC delivery remain independently incomplete.

ADR-0011 was explicitly accepted by the user on 2026-09-22 (“i accept”); read `decisions/ADR-0011-owner-profile-enrichment.md` and its acceptance evidence before implementation. Do not silently choose other field/privacy policies. Coordinator publishes this contract and status on main first. After acceptance, dispatch a fresh implementation agent on `agent/TASK-006-profile-enrichment` from latest origin/main; provide only this task and relevant context. Split work if it exceeds this bounded contract.

## Required context
- AGENTS.md, this contract, ADR-0011 and recorded acceptance, NOW/BACKLOG.
- TASK-003 contract/handoff; TASK-002 identity/RLS and TASK-004 header implementation.
- Accepted MVP/PRINCIPLES, architecture, DATA_MODEL, AUTH, AUTHORIZATION, SECURITY_AND_SAFETY and TESTING.
- UX INFORMATION_ARCHITECTURE, USER_FLOWS, SCREEN_INVENTORY, UX_PRINCIPLES and DESIGN_DIRECTION; Accepted ADRs 0002, 0006–0009.
- Existing profile migrations, validation, access helper, server actions, photo route, tokens and local verification scripts.
- Before substantial UI: installed Leon Taste skill and current live https://usepals.com/ inspection; write a responsive interaction/visual plan.

## Allowed scope after acceptance
- Committed local migration for accepted optional profile fields and ordered extra-photo references, database validation and referenced-object deletion protection.
- Owner profile view/edit page from avatar/header; required-field edits and primary replacement; optional interests/down-to-do/music/foods/fact/prompts/Instagram; up to four extra-photo add/replace/remove operations as specified in ADR-0011.
- Reuse live verified/readiness gates, immutable private uploads and server-only caller session. Preserve read-only university/email and verification wording.
- Shared validation/types only as needed; local synthetic tests and rendered responsive verification; appropriate loading, saving, empty, success and recoverable error states. Preserve safe entered values after errors; never treat client state as authorization.
- Explain current owner-only visibility in the product. Keep returning to Hangouts straightforward; no profile-first onboarding expansion required to enter the app.

## Out of scope
Peer profiles/photos, people discovery, friendship, messaging, Hangout schema/flows/eligibility, blocking/moderation implementation, arbitrary extensible sections, new identity attributes, campus/email changes, account deletion, password recovery, external integrations, image processing/EXIF removal, photo reordering/promotion UI, storage quota/garbage-collection service, hosted Supabase/Vercel changes, deployment, analytics and unrelated architecture changes.

## Acceptance criteria
- [x] ADR-0011 explicitly accepted and evidence recorded before implementation.
- [ ] Required edits and optional round trips/clearing work; optional values never gate readiness. Existing required-field constraints, identity fields and primary ownership remain authoritative.
- [ ] Primary replacement and 0–4 extra photos work, with ordered distinct owned references and database-enforced limits. Missing/foreign/duplicate/fifth-extra references and client overwrite are denied.
- [ ] Failed save/upload/cleanup and competing replacement/removal cannot delete a currently referenced photo, silently restore removed references, expose another user's data or bypass readiness. Detached private leftovers are honestly reported/retryable.
- [ ] Owner-only profile and verified-owner Storage policies remain enforced through direct API paths, not just UI. App pages/actions/photo routes recheck live access and never emit signed/public URLs or accept arbitrary photo paths.
- [ ] Anonymous, other-owner, operator, unconfirmed/changed-email, inactive-campus, suspended/banned and stale-session access matrix passes. Incomplete users retain onboarding; loss of primary or required completeness still revokes ready access.
- [ ] Existing auth/onboarding/map regressions pass alongside new database/HTTP permission and meaningful validation tests. Two clean local resets reproduce migrations; schema lint and relevant repository checks pass.
- [ ] Rendered desktop/mobile and keyboard flows verified for edit, save, cancellation/navigation, photo management, optional empty, loading and error recovery states; record actual evidence and unverified cases.
- [ ] Fresh security review resolves findings; coordinator reviews implementation and handoff. Docs/state/queue/changelog synchronized; task branch and integrated main pushed and remote SHAs verified before task completion.

## Tests / verification
Use `pnpm check`, `pnpm db:verify`, `pnpm test:auth:web` and bounded new profile tests against disposable local accounts. Exercise actual anon/authenticated SQL roles, PostgREST, Storage, web actions/routes and concurrent reference/deletion mutations. Test no identity/role escalation, direct malformed optional data, no peer reads/embeds, referenced-photo delete denial, stale editor conflicts and failure cleanup. A successful privileged SQL setup is not RLS evidence. No hosted fixtures or hosted delivery claims.

## Documentation / handoff
Update relevant AUTH/DATA_MODEL/AUTHORIZATION and local test/setup docs only for implemented behavior. Coordinator owns shared NOW/BACKLOG/CURRENT_STATE/CHANGELOG updates and main publication at material milestones; implementation agent supplies proposed updates in its handoff. Use agents/HANDOFF_TEMPLATE.md, record task/main remote SHAs and remaining blockers, then stop. Planning handoff: agents/handoffs/TASK-006-CONTRACT.md.

## Follow-ups
Peer visibility/blocking and photo metadata handling need separate explicit decisions before exposure. TASK-003 hosted acceptance, TASK-005 and other product flows remain separate.

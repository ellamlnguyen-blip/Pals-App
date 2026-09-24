# Handoff — TASK-016 local blocking and reporting

Status: All stages reviewed and locally verified; canonical integration publication pending
Date: 2026-09-23
Coordinator branch: `agent/TASK-016-planning`
Authority: explicitly accepted ADR-0018

## Outcome
Global blocking and private reporting are implemented for disposable-local development. One directional block authority now governs People, friendship, DM, Hangout membership/private access, chat and notifications. Host blockers remove joined nonhosts; nonhost blockers leave shared Hangouts, including cancelled ones. Unblock restores no relationship or attendance. Retained caller-specific evidence supports safety actions without restoring hidden content.

Private reports accept user, Hangout and retained-Hangout-host references, with caller-owned opaque receipts, exact-input retry deduplication and atomic five-new-reports-per-hour limits. There is no report reader, automatic sanction, staffed review or hosted operation.

The signed-in Safety route remains available to active unready owners. It provides full global consequences, exact-ID block management and ID-only retained recovery. Actor-bound no-store APIs, denied legacy writers, generation/abort masking and explicit uncertainty recovery preserve the backend boundary. A confirmed Direct chat block immediately removes rendered messages/composer.

## Stages and publication
- A reviewed task `2819d8f7e04dad24121fd891fa2c53e546344f90`; main integration `d99adde65858080a0d5a6e966396b26be7e4fd1a`.
- B reviewed task `427254cb79703e8894ae2571444c9461762da0f3`; main integration `fb697c23daa02c0d1f7f6e26259eddbd630b46f8`.
- C reviewed task `713e7c500f4c91b8ef6ba64b3bbf2c2b99664944`; canonical integration receipt follows publication.
Each stage had a narrower independently reviewed contract published on main before implementation and a fresh exact-tip reviewer before acceptance. Stage handoffs contain detailed evidence and limits.

## Verification
A exercised clean resets/prior-schema upgrade, actual-role SQL, real Auth/REST access, observed-lock races and built web regressions. B exercised reporting authorization, retained-source retry, rate-limit races, gate/account ordering and privacy. C exercised real production-mode API/action flows and actual transpiled client logic under controlled opposite mutation orders and lifecycle events.

Independent rendered review covered active-unready access, verification navigation, desktop/phone light and forced shipped dark rules, native keyboard focus/Escape, long-ID wrapping, exact block/unblock and owner-list refresh, retained-host reporting, Other validation, Unicode length and private receipts. Real response-loss proxies proved truthful uncertainty and explicit retry/exact-state recovery. Database aggregate counts proved no duplicate report. Navigation/Back and signout masked drafts/IDs; a ready Direct chat block removed messages/composer immediately. Implementer separately inspected tablet820.

The dark check activated actual shipped dark CSS rules through a disposable local proxy; it was not OS preference emulation. SQL tests used direct streamed PostgreSQL execution where the isolated-worktree Lima mount prevented the usual wrapper. A second owner-list keyset page was not independently rendered; backend bounded-page and client sequencing checks provide its boundary evidence. No green CI claim.

## Known limitations
B's unchanged notification fixture returned NULL once at assertions43/45 in a full stream, then passed61 subsequent runs. Root cause remains unresolved; timestamp ties or a preexisting cause were not substantiated. Independent B review accepted its scope and retained a separate maintenance investigation. Do not describe the full source stream as unqualified green.

An authorized in-flight read can reflect its earlier snapshot. Aborting a browser fetch cannot undo a database mutation already dispatched; desired-state block writes have no revision or retry key. The UI therefore rechecks and never automatically replays an uncertain intention. Local reports do not guarantee emergency response or physical safety.

No hosted migration, deployment, live-student data, production retention, moderation console, co-host implementation or launch readiness is included.

## Cleanup and next task
C verified a fresh reset: task fixture data zero, all seven gates false, owned web/proxy ports3100–3102 and Supabase/Lima stopped. Temporary credential/reference files and proxy scripts were deleted. Unrelated port3000 remained untouched.

Next is TASK-023 student frontend design alignment, per the reviewed accelerated schedule. Create one fresh Pals project task from the final canonical main, GPT-6 Sol medium, following standing automatic handoff. Standard speed is an app preference that dispatch tooling cannot configure or verify. TASK-010 has a separate existing owner and must not be duplicated.

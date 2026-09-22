# TASK-003 — Verified student auth and onboarding
Status: Implemented, locally verified and reviewed by the coordinator. Deployed HTTPS callback remains pending a frontend deployment and SMTP, so the full task is not closed.

## Goal
UNC student can sign up, verify email, complete required profile, and enter Pals.

## Dependencies
TASK-002 complete, reviewed, and schema/authorization decisions accepted. Use a fresh implementation agent on `agent/TASK-003-auth`.

## Required Context
- `AGENTS.md`, this task, prerequisite TASK-002 handoff
- `docs/product/MVP.md`, `PRINCIPLES.md`
- `docs/engineering/AUTH.md`, `AUTHORIZATION.md`, `DATA_MODEL.md`, `SECURITY_AND_SAFETY.md`, `DEPLOYMENT.md`, `TESTING.md`
- `docs/ux/USER_FLOWS.md`, `INFORMATION_ARCHITECTURE.md`, `DESIGN_DIRECTION.md`
- Relevant Accepted identity/safety/Supabase ADRs, installed Leon Taste skill, existing design tokens/components, live `https://usepals.com/`

## Allowed Scope / Exclusions
Signup/signin/signout, email confirmation, server-side campus access gates, required-profile onboarding and primary photo storage permissions. No optional profile enrichment, Hangout backend, social or messaging features. Protect profile photos and document their permitted readers. Confirm the precise UNC verification-domain/eligibility policy before implementing it as production policy.

## Design and Verification
Make a deliberate visual plan and extend shared tokens/components consistently before building the flow. Inspect desktop, tablet and mobile behavior, form labels/focus/errors/loading, verification and redirect states. Automated tests must cover email confirmation, incomplete profiles, role escalation, suspension and server-side access denial. Test local callbacks and configured staging callbacks; record unavailable staging checks honestly.

## Documentation / Handoff
Update auth/setup/authorization docs, current state, changelog and task queue. Write `agents/handoffs/TASK-003.md` using the template with test and visual evidence, then stop. Orchestrator should request a fresh security/design review before closing.

## Required Fields
name, verified university email, university, graduation year, major, short bio, primary photo.

## Acceptance Criteria
- [x] unverified users blocked from verified experience
- [x] verified UNC users onboard successfully (local Auth/Storage integration)
- [x] verified badge state exists (“UNC email verified”)
- [x] suspended user denied
- [ ] auth callbacks work local/staging
- [x] critical auth/RLS tests pass.

Local callback is verified through the actual Next route. Combined local/staging callback criterion remains open because no deployed HTTPS frontend or SMTP delivery setup exists. Hosted migration/catalog/lint checks pass separately; see handoff and hosted environment inventory.

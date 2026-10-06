# TASK-028P — Reference-led profile remodel

Status: Incomplete; authorized owner/current-text UI reviewed and locally verified through `2e9fa95`. Expanded peer presentation awaits explicit ADR-0036 acceptance and implementation; parent staging/main source integration remains gated. See `agents/handoffs/TASK-028P.md`.
Date: 2026-10-06
Parent: TASK-028 (incomplete; its staging/dependency/main app integration gates remain).
Branch: `agent/TASK-028P-profile-remodel`
Canonical baseline: `63dd1a831b138d9a0d85c0f4642fd155cfb64dbf`; reviewed local dependency TASK-028 `0b1269cfb6f5e77fe112abf31d21c6caa8696666` (app freeze `9ef3354678408f8110e87619c2b1b35cb548ea1f`). Start from freshly fetched canonical main and merge that dependency only on this local implementation branch. Do not integrate unfinished parent source into main prematurely.

## User contract

The user's October 6 profile screenshot is the visual authority: friendly blue Pals header with back/options controls, wide rounded primary photo, prominent real name and UNC-email verification badge, optional hometown, bio, soft-blue university/major/class facts, prominent Add friend/Say hi actions, four extra photos in a two-column gallery, and three question/answer prompts. Remodel the existing web product responsively and make supported owner editing, photos, friendship, first-message requests, navigation and recovery easy to use. The reference's Maya Chen content is illustration, not real user data to copy into live profiles. Every completed increment must be reviewed and actually tested before user review.

## Authorized lane now

Use the existing stack, shared design tokens/fonts and existing owner save/photo/revision contracts. Build a readable self-profile first with Edit profile/details, separate accessible photo controls, honest missing content, retained rich fields, clear save/cancel/retry/conflict behavior and keyboard focus. Match the reference composition at narrow widths; adapt it to a centered readable desktop canvas. Preserve active drafts, validation, revision conflicts, optional onboarding and private owner photos. Restyle peer profiles using only the current People RPC text allowlist and real existing friend/DM/safety actions. Do not fabricate a peer photo or verified claim. Source-backed verification only. No unrelated navigation/architecture changes.

## Conditional peer lane

ADR-0036 is Proposed. No new hometown storage, extra peer fields, peer photo gateway or new consent schema until explicit user acceptance and independently reviewed bounded security contract. Continue independent owner/authorized-text work while the decision is pending. Existing stored photos/prompts must never become shared automatically. Record any incomplete reference sections honestly.

## Acceptance

- Reference-matched typography, spacing, colors, hero/gallery crop and responsive sections; accessible contrast/touch targets and no horizontal overflow at 320/390/793/1280 widths.
- Actual save/cancel/details/photo add/replace/remove and reload behavior, no lost drafts after failure or stale revision; readable loading/empty/error states.
- Peer Add friend/request/cancel/accept states and Say hi/consent-based DM request behavior retain caller binding, block/opt-out/sanction/source denial and truthful success/retry behavior.
- Focused tests appropriate to changed code plus lint/typecheck/build; real browser primary flows, desktop/mobile captures and independent implementation/security/design review. Save project-root design-qa.md with image comparison evidence and honest passed/blocked result.
- No public Storage, signed peer URLs, exposed credentials, weakened RLS or hosted/production/domain changes.
- Consolidated handoff, current state/queue/change records, branch commit/push and remote SHA; main source integration only after parent dependencies and required review are satisfied. No successor chat from this substage.

## Coordination

Coordinator owns contracts/ADR/shared records and browser QA. Fresh task-specific implementation agent owns bounded frontend files; independent reviewer checks security/interaction changes. All dispatches use GPT-6 Sol / medium; dispatch tools do not expose or verify Standard speed. Keep the existing detached local preview running until a separately built reviewed replacement is ready; never share its .next build directory with an in-progress build.

# TASK-029 — Reference Hangout detail and profile screens

Status: Contract reviewed; implementation follows remote-verified canonical publication.
Date: 2026-10-13 (America/New_York).
Branch: `agent/TASK-029-reference-screens`.
Canonical baseline: `9a7464a6cf98c043425962d2e8ccf0e7960b5f7b`.
Application dependency: reviewed P2 `20cdd69cc45398334dbd37aeaee29bd980d1a514` (application milestone `e27db7a3808a266d452878581e9d0c5a73f9b4cf`). TASK-027 staged acceptance and TASK-028/P main application integration remain incomplete.

## User request

Match the supplied Hangout detail screenshot and the two owner/peer profile screenshots. Use familiar social-app interactions to make navigating, viewing photos, editing one's profile, adding a Pal and messaging understandable. The first screenshot is interpreted as the saved Hangout detail screen; map-first Hangouts discovery remains its entry point. References are visual/layout evidence, not permission to populate sample people/content or widen data access.

## Bounded scope

- Shared student header on the three screens: existing Pals logo/fonts, five primary destinations, avatar account menu, clear active navigation, accessible phone navigation, with all destinations retaining their existing availability gates.
- Hangout detail: generous title, host/co-host roles, authorized attendee preview, readable campus date/time/description, prominent current-state joining/chat action, public approximate-place map and an external map link that uses only already-public coordinates. Keep private meeting instructions separate and caller-authorized. Preserve host/co-host management, loading/paging, cancellation/removal, uncertain outcomes and Safety entry.
- Owner profile: circular authorized portrait (neutral circular fallback when missing/denied), centered name and truthful UNC email badge, compact icon facts, two-column personal gallery, interests and existing prompt answers; Edit profile and photo edit affordances use existing save/upload actions. Preserve active drafts, revision conflicts, cleanup, sharing explanation and view/edit dialog behavior. Do not derive a student's academic year from graduation year or substitute sample answers.
- Peer profile: same composition, View-only photos, real friendship states and Message entry through existing DM request/accepted-chat flow. Rich photos/hometown/prompts appear only through current explicit consent and existing RPC/gateway authorization. Missing/denied data is omitted or represented neutrally.
- Preserve browsing context on returns where existing safe route validation allows it; any new return destinations must be narrow validated local paths/UUIDs. No arbitrary URL navigation or cached authorization reuse.
- Reuse authorized People projections for roster presentation only if both current Hangout roster authority and People consent permit it. Otherwise show a neutral role/initial placeholder. Never query raw profiles/Storage paths, guess photo revisions, expose hidden attendees, claim a total from a paged subset, or grant new privileges. If this cannot be achieved within the existing authority, deliver the visual neutral fallback and document the dependency.

## Exclusions and release boundary

No schema, RPC/grant/RLS, provider credential/gate, production/domain, realtime, popularity/follower/feed, invitation, or hosted-data change. No real-user messages or fabricated staging identities. Existing staging deployment is not repointed by this task. Automatic Git previews may build a task branch; no configured hosted release is claimed. Application changes remain on the task branch behind existing TASK-027 acceptance. Documentation contract/status may integrate into main separately.

## Execution and ownership

Coordinator owns source reconciliation, shared tokens/header, task status, QA runtime and publication. Start task branch at latest canonical main, merge the exact reviewed P2 dependency only into that task branch, and retain canonical corrected staging controls. Inspect the merged diff against P2 and main before implementation.

Fresh GPT-6 Sol medium workers receive only this bounded contract and relevant context: profile presentation worker owns profile/peer screen files; Hangout worker owns saved detail files and its narrow presentation helpers. They do not edit shared task records/tokens/header or provider controls. Coordinator reviews their handoffs before dependent work. A fresh read-only reviewer checks final UI/privacy/navigation changes. Dispatch tools cannot configure or verify Standard speed.

## Verification and acceptance

1. Actual rendered desktop/phone screens preserve the references' circular portrait, centered profile identity, compact facts, gallery geometry, blue/white hierarchy and two-column desktop Hangout layout. Collapse cleanly at 320/390 px; also inspect tablet and 1280 px. Record screenshots and necessary privacy/accessibility differences.
2. Owner View/Edit and detail/photo save controls, peer View-only dialogs, friendship/DM states, Hangout joining/chat and Safety/management entries remain functional. Keyboard focus, Escape/dialog close, long names and empty/error/denied/uncertain states are checked.
3. Focused navigation/presentation tests where they cover real logic, existing relevant unit tests, lint/typecheck and production build pass. Use only a disposable local runtime for synthetic fixtures. Tests are scoped to changed behavior; prior P2 runtime evidence is not represented as rerun.
4. Source review confirms no raw profile/photo leak, no expanded permissions, no exact-location leak and preserved current-source clearing/revalidation. Fix actionable findings.
5. Publish reviewed task source/handoff, verify remote SHA, and publish documentation-only main status with outcome/evidence/remaining gates. Complete parent/app main integration only after the preexisting staged acceptance dependency actually clears. A task-branch push alone does not mark TASK-029 done.

## Visual and interaction plan

Reading this as a brand-preserving student utility redesign with an airy blue/white visual language. Reuse Baloo 2/Nunito and Phosphor. Design variance 3, motion 2, density 4; state transitions and focus matter more than decorative animation.

Desktop profile: global header; back/action row; approximately 180 px circular portrait centered; centered display name/badge; icon facts in a two-column block; optional bio; approximately 840 px wide gallery with 1.75–1.85 image ratio; interests before plain separated prompt rows. Owner controls are clearly distinct from peer friendship/message controls. Existing arbitrary prompt questions/answers remain user content.

Phone profile: primary destinations stay reachable; portrait shrinks; action row wraps; facts stack; gallery retains two columns where usable and images open in a focus-managed dialog. Editing opens existing validated controls with draft-preserving errors. Peer Message focuses/opens the request composer or current thread based on the actual state; never implies delivery before acknowledgement.

Hangout: desktop plan/people/joining on left and public location/map on right; phone stacks plan/primary action before map. Preserve semantic time, joining closed/cancelled/removed/unknown states. After confirmed joining, chat is an obvious next step; uncertain writes require current-state recovery. Attendee browsing presents only authorized profiles and keeps a safe path back to the plan. Map accuracy is explicitly approximate and does not show live people.

Reference images are local user attachments under `/Users/ellanguyen/Desktop/pals app/`; do not commit these personal reference files. Current `https://usepals.com/` was inspected on 2026-10-13: white canvas, blue logo/display type, rounded campus-map composition. Its older navigation is not product authority.

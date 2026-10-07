# TASK-028P1 — Hometown and direct photo controls

Status: Reviewed and verified locally; incomplete pending parent-gated canonical application integration. Parent TASK-028P rich peer decision/implementation remains incomplete. See `agents/handoffs/TASK-028P1.md`. Date: 2026-10-06.
Branch: `agent/TASK-028P1-profile-corrections`.
Fresh canonical baseline: `7d33d98dd2c078963e1ce30a4deb7f31cb8fc2b6`; reviewed parent source branch `3f7c5f6eecbef7f1e77be642eb7f8ac2749e30a0`, app freeze2e9fa95. Start from freshly fetched main including this contract, merge reviewed parent only on the task branch. Canonical app integration remains gated by TASK-027 staging acceptance.

## User intent

Correct the supplied reference for every account, not a Maya-only mockup: optional hometown with pin before bio; clicking any saved owner image offers View photo / Edit photo; View opens an accessible dismissible large image; Edit opens/focuses the corresponding existing replacement control. Other people's profiles should use the same design with their own content; expanded rich peer disclosure is separately awaiting ADR-0036. No generated real-user defaults.

## Bounded implementation lanes

DATA: implement Accepted ADR-0037 owner hometown via committed migration; owner column grant/constraint with existing RLS/revision guard; OwnerProfile typing, server selects/normalization/save. Own migrations, tests, packages/types, profile validation and server-only owner profile/save files. Do not edit editor, summary or profile CSS; do not change peer RPCs or grants. Add meaningful Unicode trim/length, owner write/read versus peer denial and revision tests. No hosted operation. Handoff for independent review before dependent UI wiring.

UI: saved primary/extra images are accessible photo-action triggers. A small modal/dialog gives View photo and Edit photo; keyboard focus/escape/dismiss/return work. View uses the existing private owner URL; no new signed/public URL or download path. Edit directly opens/focuses the correct per-slot control, preserving existing add/replace/remove/revision/draft contracts. Preserve all image crops and loading/error states. After reviewed DATA handoff, wire optional hometown in editor and shared summary with Phosphor pin and safe wrapping. Omit absent peer/owner hometown honestly; owner editor supplies the field. Owner edit options never appear for peers. Own editor/summary/CSS and isolated photo UI component only. Do not change database/server contracts.

## Acceptance and verification

General data-driven behavior for existing/new owners, populated/empty states and no fixture hardcoding. Actual primary and extra image click → both choices; view dismiss/keyboard/focus; edit correct slot, selection, replacement/reload; optional hometown save/clear, Unicode100 boundary, stale-save preservation. No overflow at320/390/793/1280; compare rendered reference and update design-qa.md. Focused meaningful tests, lint/typecheck/production build and fresh independent source/security review. Root browser-tests final exact build in the named disposable local environment; preserve earlier user data and original preview. Record outcomes/handoff and remotely verified task/main documentation publication. No successor from this substage.

Coordinator owns docs/ADR/queue/QA, task agents own specified non-overlapping files and stop after handoff. All dispatches GPT-6 Sol/medium; tool speed setting unavailable/unverified. Read AGENTS, relevant product/auth/data/safety/UX and installed Leon taste skill before substantial UI. No rich peer implementation until explicit ADR-0036 acceptance and separately reviewed narrower contract.

# TASK-010B — Local host/co-host management UI

Status: Independently reviewed dependent planning contract; implementation blocked until reviewed TASK-010A integration
Date: 2026-09-25
Parent: `tasks/active/TASK-010-host-cohost-management.md`

## Goal and prerequisite
Give ready local hosts and co-hosts the management controls accepted in ADR-0012, consuming the exact reviewed TASK-010A API. This contract defines the dependent UI boundary now; coordinator must reconcile it with the final A handoff, publish any needed narrow update and dispatch a fresh UI agent only after A is reviewed/integrated/remote verified. No speculative API names or client-written role state.

## Required context
AGENTS, parent TASK-010, Accepted ADR-0012, finalized A contract/handoff/review and actual RPCs; TASK-015/016/017/018/020 handoffs; current saved detail, owner editor, TASK-020 host joining control, Calendar/People, UX/design tokens and safety/authorization specs. Before substantial UI: read installed Leon Taste, inspect `https://usepals.com/` and rendered current app, then write a desktop/phone interaction plan. Product/accessibility/safety rules take precedence.

## Allowed UI and actions
- Extend existing saved Hangout detail/owner editor instead of building a second host joining control. Host can cancel, remove visible currently joined nonhosts, promote/demote and edit as already authorized; co-host can edit permitted public/private fields, open/close joining, remove only current-ready joined ordinary attendees and step down/leave. Host-only coarse large-Hangout warning and join controls from TASK-020 remain truthful; adding the accepted co-host joining control must not disclose the host-only size flag.
- Show current-ready roster account IDs and authorized role labels only. A separate host-only assignment management panel lets the host reach and demote nonready retained assignments using A's bounded cursor reader. Do not display names/photos or blocked identities through ordinary roster; do not make co-hosts owners in Calendar Hosting. If a manageable-Hangouts entry is necessary to reopen a co-host edit, keep it bounded and labeled as management rather than Hosting.
- Explain promotion powers before immediate assignment; explain demotion/step-down versus removal and participant-only private instructions. Confirm destructive cancellation/removal, including terminal self-rejoin denial after removal. A cancelled Hangout has no edits/joining or role assignment. Existing backend host removal of a known left nonhost ID remains authorized but B adds no historical-member enumeration or general left-member removal UI. The UI offers only controls supported by a currently authorized visible roster/assignment entry; nonhost leave after cancellation remains available under current database authorization. Never infer completed attendance from time.
- Every action uses caller-session RPC with APP_ENV=local, validated loopback Supabase target, live readiness and database gates. Carry expected revision for management writes, reload authoritative state before reporting success after an uncertain response, and never blindly replay a destructive action. Stale errors retain safe form text and offer review/reload; denied/uncertain role or source state hides/locks controls. Recheck private details separately and hide them immediately during leave/cancellation. No private details in roster, list, Calendar, URLs, logs, action results or caches.
- Render loading, empty, error, denied, cancelled, disabled, stale and response-loss states on desktop/phone/keyboard. Preserve accessible no-map list, existing mock/saved separation and default-off local gates. Notifications may arrive through existing material-edit/cancel/join/leave events only; no co-host alert claim.

## Exclusions
Schema/RLS/RPC changes, operator/moderation UI, new notification/analytics events, peer profiles/photos, invitations/restricted modes, chat or attendance management, size-signal consumer, hosted/deployment and unrelated harness fixes. If final A API cannot satisfy a required state safely, coordinator returns to a separately reviewed backend correction instead of widening B.

## Acceptance and verification
Actual local ready host/co-host/nonhost/removed/blocked/suspended/disabled flows use the finalized A API and prove controls follow database outcomes after refresh. Test stolen/stale role actions, same/co-host target, nonready assignment demotion, disabled Hangout and lost response; confirm neither hidden private instructions nor host size signal reaches co-host/public payloads. Verify desktop/390px/320px phone, keyboard focus and loading/empty/error/denied/stale/uncertain states. Run relevant `pnpm check`, actual-role SQL regression, built-loopback Auth/HTTP/action/concurrency suites and browser interactions. Fresh security/design review plus coordinator rendered review clear; handoff, cleanup, task and canonical main remote receipts precede parent completion. Known CI helper limitations must be disclosed, not treated as a pass.

## Handoff
Use `agents/HANDOFF_TEMPLATE.md`. Coordinator owns stage dispatch after A, shared status and parent completion. This dependent planning contract does not authorize a UI agent before A's review/integration.

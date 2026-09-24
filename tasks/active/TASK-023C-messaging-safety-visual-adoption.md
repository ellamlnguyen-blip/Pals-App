# TASK-023C — Chats, Notifications and Safety visual adoption

Status: Independently reviewed and integrated on canonical main; authenticated parent QA pending
Parent: `TASK-023-frontend-design-alignment.md`

## Goal

Finish route-wide visual alignment by applying the A/B student system to Chats and DM requests/threads, Notifications/preferences, and Safety, while preserving all previously verified messaging, notification and global safety behavior.

## Dependency and context

Read `AGENTS.md`, parent task/plan, TASK-023A/B handoffs and exact-tip reviews, TASK-016C handoffs, accepted product/UX/backend contracts and Leon Taste. Inspect live usepals.com afresh before substantial UI work or record its unavailability. Coordinator must review/integrate B and publish this narrower C contract on canonical main before fresh C dispatch.

## Scope

- Use shared student shell, navigation, tokens, typography, panels, controls and status styles on Chats list, Hangout thread, DM inbox/request/direct thread, Notifications inbox/preferences and Safety dashboard/dialogs. Remove repeated route-level nav only where replaced by the shared shell.
- Preserve chat membership, requests, polling, revocation and direct-chat masking; notification actor/readiness and unread semantics; block/report exact/unknown states, private receipts, same-attempt retries, focus and lifecycle masking. Do not expose hidden data for presentation.
- Check desktop/tablet/phone and narrow states, keyboard/focus, light/dark, loading/empty/error/denied/gate-off using only disposable local fixtures. Record actual rendered coverage versus source/static checks.

## Forbidden changes

No schema, RLS, Supabase, backend authorization, server action, API route or contract, `apps/web/lib/`, payload, validation, feature gate, provider, hosted, production or admin changes. No TASK-010 host/co-host work.

## Acceptance and handoff

Run relevant workspace/UI/action regressions; inspect final diff for prohibited backend changes. Write a handoff with routes, viewport/state evidence, privacy/safety preservation, limits and task SHA. Fresh independent exact-tip design/security review and canonical integration precede parent completion. The final TASK-023 closure must include real authenticated routed checks across A/B/C, especially A's saved/create/owned Hangouts, B's Calendar/People, and C's messaging/safety states, when port 3000 is available. Synthetic presentation preview alone is insufficient.

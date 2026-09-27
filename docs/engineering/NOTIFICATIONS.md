# Notifications

## Initial-release scope amendment — 2026-09-26

[Accepted ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) narrows the initial UNC release only. Existing notification inbox/preferences and refresh/polling behavior are accepted; Realtime, push and optional notification email are deferred. No new category wiring, instant delivery or missed-event backfill is inferred. Current source-event implementation and neutral unavailable destinations must be verified in rehearsal. Actual UNC Auth email verification/delivery and HTTPS callback remain required and are distinct from notification email.
Two layers: in-app Notifications tab and push.

MVP in-app categories: friend request/accept, message request, direct/hangout message, hangout update/cancellation, host-relevant join/leave, reminder, safety/moderation, attendance prompt.

Preferences are category-based. Friend-activity push is optional and only if enabled. Avoid engagement-bait notifications.

## TASK-016A local block reauthorization

The inbox rechecks each stored event against current global block rules. Blocked Hangout host/attendee events and chat-author events become the same neutral unavailable row as revoked social events: only opaque notification ID, server time, read state and the label `Unavailable` remain. A third-party hosted Hangout can stay visible while a blocked author's chat notification is neutral. Safety departures/removals create no ordinary event; nonconflicting source events retain ADR-0017 gate, preference and cancellation behavior. Opening a destination always repeats its source authorization.

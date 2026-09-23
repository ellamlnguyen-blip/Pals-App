# Notifications
Two layers: in-app Notifications tab and push.

MVP in-app categories: friend request/accept, message request, direct/hangout message, hangout update/cancellation, host-relevant join/leave, reminder, safety/moderation, attendance prompt.

Preferences are category-based. Friend-activity push is optional and only if enabled. Avoid engagement-bait notifications.

## TASK-016A local block reauthorization

The inbox rechecks each stored event against current global block rules. Blocked Hangout host/attendee events and chat-author events become the same neutral unavailable row as revoked social events: only opaque notification ID, server time, read state and the label `Unavailable` remain. A third-party hosted Hangout can stay visible while a blocked author's chat notification is neutral. Safety departures/removals create no ordinary event; nonconflicting source events retain ADR-0017 gate, preference and cancellation behavior. Opening a destination always repeats its source authorization.

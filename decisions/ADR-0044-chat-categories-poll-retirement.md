# ADR-0044 — Categorized chat navigation and poll retirement

Status: Accepted for bounded disposable-local implementation from Ella's explicit 2026-10-16 request; no hosted or application-main release acceptance.
Task: TASK-037

## Decision

Hangout and direct conversations appear in separate sidebar tabs. The underlying private chat attention source, ordering and authorization remain authoritative. The web may page that combined source in bounded batches to provide category views, but must preserve every source item and expose continuation when a category is sparse. A tab switch starts a fresh authorized category read; stale results do not cross categories or account transitions. Incoming direct-message requests remain within Messages and have a visible route from either tab.

The student-facing poll feature is retired. Remove web poll controls and the HTTP poll route. A committed additive migration revokes authenticated execution of the four public poll RPCs. Keep private poll/option/vote/retry records; no destructive drop or backfill is needed for a UI correction. Existing source/chat/safety permissions remain unchanged. This supersedes only ADR-0042's poll section; its friendship/request DM, co-host invitation and notification decisions continue.

The visible Chats heading is removed from chat screens but retained as a screen-reader heading. The Hangout title becomes the detail link; the separate View Hangout details action is removed. The header and Pals naming follow later explicit instructions, regardless of the older sample navigation.

## Acceptance evidence and gates

Ella explicitly said to separate Hangout messages from direct messages and to “get rid of the poll feature” on 2026-10-16, reversing her earlier poll request and unified-list preference. This accepted product direction authorizes bounded local retirement and the narrow grant revocation; it does not authorize deleting retained user data, hosted migration, release or direct main integration. Verify the grant revocation with an authenticated role and preserve the denied behavior of old API callers.

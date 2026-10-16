# TASK-033A Combined chat inbox — implementation handoff

Status: bounded Stage A candidate on `agent/TASK-033-chat-notifications`; parent TASK-033 remains incomplete. Baseline `489b5452c1e592732a83641e7cf0084f96793f4c`, including reviewed TASK-032 source dependency. No hosted operations, schema, gate, permission, consent, notification event, or friendship changes.

## Outcome

- `/chats` now presents one row list for accepted DMs, pending DM requests, and authorized Hangout chats. Each entire row opens the existing direct/request management or Hangout thread. Visible `Your chats` and Notifications `Inbox` headings are removed while accessible names remain.
- Caller-bound `/api/chats` is private/no-store. It pages at most 24 records from each persisted source with paired cursors and Previous/Start over/Next navigation, rechecks each Hangout through `read_hangout_messages` with limit 1, and conceals denied Hangouts. It returns source-specific retry errors, keeps an independently closed DM gate from hiding available Hangouts, and rechecks account identity/readiness before returning rows.
- Peer display names come only from a fresh `get_people_detail` row whose account ID exactly matches the DM peer. A peer without current People visibility appears as `Person unavailable`, without an ID label or first-message preview. A transient detail error fails the page closed to a retry state; malformed DM source rows are rejected. Optional circular photo uses the existing protected People photo route only after `get_rich_people_detail` yields a matching subject and valid primary revision. Hangouts use the existing title-derived activity emoji and scheduled start. The combined page mixes DM generation creation time with authorized Hangout creation time, never a latest-message or membership-time claim. The Hangout participant `state` and `joined_at` fields are intentionally not queried: current authenticated grants expose only `hangout_id` and `account_id`, while RLS and the chat RPC enforce joined membership.
- The client reuses the audited DM auth-transition verifier, including begin/settled/cancelled masking, account probes, visibility/focus refresh and stale-response suppression. Request preview and management remain available through the existing request model.

## Verification

- Scoped ESLint: pass.
- `combined-inbox-paging`, `combined-inbox-projection`, `people-card-photos`, `auth-transition` Node tests: 13 pass.
- Web TypeScript check: pass using the TASK-032 dependency checkout, including its existing `react-easy-crop` link.
- Static access inspection: existing Hangout thread enters through `readChat` and the database `private.chat_authorized` requires current joined membership; send performs a fresh `private.chat_require` after locks. No defect found in source inspection. Live joined-member entry/send and rendered desktop/narrow QA remain for coordinator runtime.

## Review notes

- Combined pages are source-keyset batches sorted within each page by source creation time, not a global recency feed. Neither source exposes latest message time; the authorized Hangout source does not expose membership time. A page can contain up to 48 visible records before gate denials. A fully denied Hangout batch may show an empty page with a further page button, preserving access concealment and cursor progress.
- Confirm the scoped query behavior in a disposable local backend and exercise account switch, DM gate off, Hangout denial, request management and load-more UI before accepting. Parent sign-off and integration gates remain open.

## Rendered QA follow-up

Coordinator screenshot review found the accessible Chats `h1` and nested Notifications `Inbox` `h2` visibly rendered because `.sr-only` was not global and the Notifications selector matched only a direct child. Scoped CSS now visually hides both headings while keeping them in the accessibility tree. Prettier and scoped ESLint pass; the coordinator will rebuild and verify actual rendered desktop/narrow results after this commit.

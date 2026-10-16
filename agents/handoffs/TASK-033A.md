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

## Coordinator review and disposable-local verification

Fresh GPT-6 Sol/medium review found pending request previews surviving failed fresh peer visibility and misleading Load more replacement. Source5a30db58 fixes exact peer binding, preview/photo removal and retry errors, and provides Previous/Start over/Next page controls; reviewer confirmed no remaining scoped findings and13/13 tests. A rendered check then found scoped sr-only CSS did not reach either heading. Source4df45ee827357b2a7d098554181e66374817282d fixes the selectors; final production webpack build including TypeScript passed. Actual computed heading boxes are1×1px with clip0; final screenshots visually confirm both visible headings removed.

Actual1280×720 desktop and375×812 narrow combined list contains one named/photo-backed DM request and8 emoji/title Hangouts, nine whole-row links, no nested controls or horizontal overflow, minimum80px row targets. Hangout row opens authorized composer; DM row opens existing request management. Source creation time orders each bounded batch; this is not a globally recent-message feed. More-than24-source UI pagination and real account-transition timing were not newly browser exercised; helper/auth tests and fresh source review cover bounded paging/stale suppression logic.

Named pals-task029-disposable normal Auth/RPC/HTTP verifies combined no-store200, authorized peer name, wrong actor/anonymous403, invalid cursor400 and exhausted cursor empty. A new synthetic Hangout5e3ab66c-489c-48e1-ae63-1efc875ae523 verified nonmember403→join→read/send200→freshAuth persisted body→leave→read/send403; owner cancelled only this new fixture, retaining its evidence. Existing profiles, consents and pre-existing Hangouts were preserved. Opening Notifications during QA performs existing owner attention acknowledgment. No schema, permission, gate or hosted change.

Evidence: docs/ux/evidence/task033a on canonical documentation branch. Proposed ADR0042 is awaiting explicit acceptance under AGENTS before polls, friend-derived DM formation, co-host invitation, reminder or new preference/event persistence. User selected friendship-or-accepted-message-request and one-hour reminder; those new permissions/jobs are not yet implemented. TASK033 and TASK032 remain incomplete behind existing sign-off/release/application-main gates; no successor. Standard speed was unavailable to configure/verify through tools.

## Publication receipt

Application4df45ee827357b2a7d098554181e66374817282d/candidate61b4c421cea04bd9abe5322afdfb32ea89cb7ec8, documentation outcomeb6754eb9428096dcf385304c3f2d1ca5186dff02 and documentation-only main46ffe5f315d1ec6242c3cef2e166ea67b2adb4b9 were pushed and independently remote verified. Canonical integration contains fourteen documentation/evidence files only. ADR0042 remains Proposed; source application integration, parent acceptance and hosted action remain gated.

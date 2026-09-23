# TASK-015B handoff — local Hangout and chat notification events

Status: task branch prepared for independent exact-tip security review; canonical integration remains coordinator-owned.

## Baseline and scope

- Branch: `agent/TASK-015B-hangout-events` in its isolated worktree.
- Exact published starting canonical main: `bdb811956f10d8a0576d995da2b2da8f12eff112`.
- Initial implementation commit pushed and remotely verified: `951a62b4c02165bb9bd8d58898e22b90717449d7`.
- Exact corrective implementation commit pushed and remotely verified after security review: `9785b7487af0eb105a5b265d45fbb1a85de99897`.
- Canonical `main` remote SHA observed after corrective implementation push: `a2a87db3c3f3606c86e5e772dd6d5f6ed5f2566a`. This task branch has not been integrated.
- GPT-6 Sol medium was assigned. The dispatch tool exposed no speed selector, so Standard speed could not be independently configured or verified.

## Outcome

- Additive migration `20260923000500_local_notifications_hangouts.sql` extends the constrained TASK-015A ledger without changing its friendship or DM event identity. Edit, cancellation, join and leave transitions get one server UUID per committed transition across recipients; Hangout-chat messages use the immutable saved message ID. The source RPC signatures and client grants are preserved.
- Edit emission follows the complete public update and private-instruction upsert/delete and compares normalized detail values. Revision-only no-ops and failed/stale edits produce no item. Creation, joining-state changes, removal and exact join/message retries produce none. Cancellation is essential even when `hangout_updates` is muted.
- Recipient selection uses current joined participants and excludes the actor; join/leave select only the current host. Source parent-row locks precede a Hangout source gate `FOR SHARE` and fresh enabled check, followed by the notification gate `FOR SHARE`, then recipient advisory locks in UUID order. The chat source also rechecks its gate. Notification gate-off and optional mutes do not veto source actions or backfill.
- Owner inbox projection rechecks current source rights by event code. Departed/removed edit recipients and revoked chat readers receive neutral unavailable entries. Cancellation requires current joined membership and cancelled-view access. Host activity uses generic wording and no attendee actor ID; chat copies no message body and projects no author ID. Destination source readers remain authoritative on open.
- Only engineering authorization, data-model and testing docs changed. No UI, co-host, global block, Realtime, hosted or push work is included.

## Verification

- Two clean disposable-local database resets applied every migration, including TASK-015B. The isolated worktree cannot be mounted into the Lima VM by `supabase test db`; the same ten actual-role SQL suites were streamed to local PostgreSQL with `ON_ERROR_STOP=1` and no TAP failure. Counts: Hangout 114, identity 53, DM 46, friendship 38, Hangout chat 72, TASK-015A notifications 31, TASK-015B notifications 48, onboarding 22, People 82, profile 37.
- New real Auth/PostgREST suite passed, including forged-source/table denial, private-only and normalized no-op edits, exact chat retry, owner isolation, leave/rejoin, neutralization, and essential cancellation under mute.
- New race suite passed with observed PostgreSQL lock waits for leave versus edit/send, removal versus edit, cancellation versus send, both orders of message mute and notification gate disable against chat send, both Hangout source-gate orders against edit/join/cancel, and both chat-gate orders against send. Admitted Hangout source mutations that waited behind a committed gate disable still committed without creating an item. A chat send behind a committed chat-gate disable failed without creating a message or item. An event holding the relevant source gate committed before disable. Post-revocation recipients received no new items; a source send after cancellation failed.
- Fourteen serial real HTTP/race suites passed: the two new TASK-015B suites and existing TASK-015A notification, Hangout/chat, friendship and DM suites. This includes surviving friendship/DM behavior.
- Mixed friendship/Hangout keyset pagination passed across a one-item cursor in the actual-role suite.
- `pnpm db:lint` found no public/private schema warnings. `pnpm check` passed formatting, ESLint, typecheck, 26 unit tests and web/admin builds. `git diff --check` passed.
- Final local inspection found all six local gates false; zero notification items, preferences, synthetic notification Auth users or notification Realtime publications. Disposable Supabase services and Lima VM `pals-task002` were stopped and the VM status verified.

## Review focus and limits

- Independently review additive ledger constraints, security-definer source hook placement, deterministic fan-out lock order, and current-source projection after leave/removal/cancellation. The exact-tip reviewer should check source-specific grants and the social checks preserved in the replaced inbox RPC.
- The source event UUID for edit/cancel/join/leave is generated server-side in the source transaction; retained items do not contain a separate event table or copied source details. The destination RPC remains the final current-authorization boundary. A concurrent inbox read that began before revocation may finish under its SELECT snapshot; a later read is reauthorized. Hosted migration, production retention and push/Realtime remain outside this local task.
- Coordinator owns exact-tip independent security review, shared queue/state/changelog, canonical main integration, and the final task/main remote SHA receipt before TASK-015C dispatch. This revised handoff commit itself must still be pushed and its final task remote SHA verified.

## Corrective review response

The initial exact-tip security review identified a race in which an admitted Hangout edit, join or cancellation could emit after the Hangout source gate was disabled. The additive migration now acquires that gate row `FOR SHARE` after the parent lock, freshly checks `private.hangouts_enabled()` and silently skips delivery if disabled. The chat path also locks and rechecks its chat gate. The observed both-order races and mixed social/Hangout cursor assertions above close the review gaps; a fresh exact-tip independent review is still required. Two new clean resets, all ten database suites, fourteen serial HTTP/race suite files, schema lint and the full workspace check passed after this correction.

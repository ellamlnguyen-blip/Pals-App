# TASK-019B handoff — conservative local event wiring

Status: task branch ready for exact-tip review; parent TASK-019 remains incomplete until review and main integration.

## Branch and scope

- Branch: `agent/TASK-019B-event-wiring` from independently verified `main` `d45193ee682506a8eea72460cbdb2eaec7ed93d9` with Accepted ADR-0023 and reviewed TASK-019A.
- Initial implementation commit: `61f4b37ea7411d80e4617a9ff5ad46a3149ae506`. A fresh exact-tip review found that its friend-request event could count an uncertain write; the follow-up correction removes that call site. The final correction commit and independently verified remote tip are reported in the agent completion message.
- No schema, hosted capture, feature gate, analytics adapter or safety flow changed. No analytics source ID or dynamic property was added.

## Outcome

- A small client component emits each authorized saved-Hangout map, saved detail, Calendar, People profile and Notifications inbox view at most once during its mounted opening, only after the corresponding result is usable. Its readiness latch survives refreshes, pagination, rerenders and Strict Mode effect replay. The map event is in saved discovery, never the mock shell. The existing adapter independently rechecks current consent and account before any request.
- Existing client call sites now emit after first-key acknowledged DM request and Hangout chat send; after a confirmed friend-request acceptance; and after a verified leave. These calls use only the accepted fixed event names. UI action and retry behavior is unchanged. Unknown/denied/stale results and same-key retries emit nothing. The leave event is suppressed if its control unmounts before the server result returns.
- The accepted allowlist still types all 14 names. Five intentionally have no runtime call site: `onboarding_completed`, `hangout_created`, `hangout_joined`, `friend_request_sent` and `hangout_cancelled`.

## Deliberate undercount and exact evidence limits

- `onboarding_completed`: `completeProfile` saves the profile, then throws a Next redirect to the ready route. `OnboardingForm` receives no one-shot save/readiness result; a ready-page render could represent an old completion. It remains unwired rather than count a redirect or page view.
- `hangout_created`: `createHangout` returns `{ kind: "saved", id, revision }` for both the first successful RPC and a replay. It can internally replay the same request after an ambiguous first response, and its result omits that fact. The client cannot prove that `saved` was a newly committed write, so creation remains unwired.
- `hangout_joined`: `join_hangout` returns `void` for both a new join and an already joined state under a concurrent call. `changeSavedMembership` returns `kind: "saved"` after reading the final joined state but cannot prove this RPC performed the transition. It remains unwired. By contrast, the leave RPC raises unless it updates an existing joined row; the successful RPC plus post-write state check supports the leave event.
- `friend_request_sent`: `createFriendRequest` can return `state: "known"` with an outgoing pending relationship after a confirmed, denied or transport-uncertain RPC. Its post-read projection shows current state but omits whether this call newly committed. The initial wiring counted that projection; exact-tip review identified the false-count risk, and the runtime capture was removed. No server response marker or schema was added.
- `hangout_cancelled`: there is no reviewed student cancel call site. No cancel UI was introduced.
- These five names are absent from runtime capture call sites. The local HTTP sink check exercised default-off and revoked zero-capture states, but no authenticated browser action for these deferred names was run. It therefore does not establish a zero-count E2E outcome for each deferred action. This is a measurement gap, not a claim of business failure.

## Verification

- `pnpm check` passed after correction: formatting, lint, workspace typechecks, 46 tests and web/admin production builds. Focused evidence tests cover first-key success versus retry, unknown/stale/denied, and accepted transition. The friend-request capture is absent because its result cannot prove a new commit; no source-text assertion is used as a test.
- A real loopback HTTP sink received exactly one consented `hangout_left` request. Its path was `/capture/`; body contained only `api_key`, event, random visit `distinct_id`, `schema_version: 1` and `$process_person_profile: false`. No account ID appeared, and no Referer or Authorization header was sent. Before opt-in and after revocation the sink received zero additional requests. The test required escalated local loopback permission; it skips with an explicit reason if a restricted sandbox denies listeners.
- A's adapter tests still cover all 14 allowlist names, consent/revocation, access uncertainty and payload validation. No external PostHog ingest occurred.
- No authenticated desktop or phone rendering was claimed in this isolated worktree. I started the existing disposable Lima/Supabase stack solely to inspect its live state. A direct database query returned `false` for all nine product gates (Hangouts, People, friendship, Hangout chat, DM, Notifications, safety, moderation and attendance), plus zero Auth users whose email begins `task019b-`. I created no fixture and changed no gate. With the relevant product gates false, the representative authorized map/detail/People/DM/chat/Notifications browser flows cannot be exercised without crossing the standing gates-off boundary. I did not launch a web server or claim a denied browser route check; A's default-off and denied-access tests provide only adapter-level evidence. Supabase was stopped, then Lima `pals-task002` was verified `Stopped`.

## Remaining gates

The coordinator owns fresh exact remote-tip privacy/security review, the unresolved authenticated desktop/phone sink-flow acceptance gate, shared NOW/CURRENT_STATE/CHANGELOG status, integration to main, remote SHA verification and final parent TASK-019 disposition. Hosted project controls and deployment remain separate. If full counts for the four deferred non-cancel events are required, review a new contract for commit evidence before changing server response shapes.

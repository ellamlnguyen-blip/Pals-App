# Handoff — TASK-008 local saved Hangout discovery, detail and joining

Date: 2026-09-22
Branch: `agent/TASK-008-map-discovery`
Starting canonical main: `aecb8a8982953e2a2c19b437a9c094f0cc1d031c`
Scope: disposable local development only; no hosted migration, gate enablement or deployment.

## Outcome

Added a distinct **Saved Hangouts · local only** entry from the existing mock map. The saved page reads published campus Hangouts through the caller's RLS session for a UNC-clipped visible viewport, with upcoming/all and open/any persisted-field filters. It starts at campus without device location, caps results at 100, checks a 101st row to disclose truncation, re-runs the full bounded query before serialization, and ignores stale client responses. Filter and pan changes clear old results immediately. The accessible list works without Mapbox; mock examples remain separately labeled and cannot join or link to saved detail.

Added a stable saved detail route with public title, description, time, approximate area, host account ID and current-ready participant IDs. Peer names/photos and historical membership are absent. Private instructions come from a separate RLS-protected request on an uncached dynamic detail page, followed by live readiness, public record and own-state rechecks. The page explains published-member access after scheduled end and its revocation conditions. Caller-session join/leave actions verify persisted membership and live readiness before success, return no private content, and leave ambiguous results uncertain. Host, joined, left, removed, closed, cancelled, missing and denied states have distinct copy. A leave attempt removes instructions from the DOM before the RPC; an uncertain/denied action locks retry until a full reload. State-keyed remount restores newly authorized instructions after rejoin.

No schema, RLS, service-role, friend-context, peer-profile, hosted provider or moderation change. The feature remains behind `APP_ENV=local`, the validated loopback Supabase target, live ready access and the default-disabled database gate. Accepted ADR-0010 remains authoritative; blocking/reporting/moderation and TASK-003 hosted delivery are still launch prerequisites.

## Review and verification

- `pnpm check` passed after final code: format, ESLint, TypeScript, 14 unit tests and web/admin builds. `git diff --check` passed.
- `pnpm db:verify` passed two clean resets with 226 pgTAP assertions each and clean public/private lint. The VM had a temporary read-only mount for this worktree's SQL tests.
- The `pnpm test:auth:web` helper did **not** complete: Next 16 dev served `/signin` as HTTP 500 with `Invariant: Expected workUnitAsyncStorage to have a store`, in both Turbopack and Webpack. The production-mode build served HTTP 200. The same three real Auth/Storage/Next HTTP/action/concurrency suites then passed **3/3** against that built loopback server. TASK-008 cases exercised saved viewport search, invalid bounds, 100-result truncation, private absence in search/action/nonmember detail, authorized joined detail, leave/rejoin, host leave denial, closed joining, removal, cancellation and gate revocation. Existing actual-role SQL/HTTP suites cover anonymous, unready, stale-email, direct-DML and other-campus policy denial. The final state-key/remount change is client-only and passed `pnpm check` after the real suite.
- Coordinator inspected the rendered built app with a disposable ready local account: desktop saved list, no-map fallback, preview, host detail and private instructions; 390×844 phone list/detail with document width equal to viewport; preview heading focus and return to list trigger. The top detail link/badge gap was fixed and visually rechecked. No public Mapbox token was configured for this run, so live tiles/pin rendering were not inspected. The actual mock Mapbox shell was previously verified in TASK-007; this task's saved pin path is build/type checked only.
- `https://usepals.com/` was directly inspected at task start; the local interaction plan records the relevant white/blue, rounded, map-led visual language.
- Fresh read-only reviewer found three privacy/focus races and a state-remount follow-up. The full-result requery, marker focus, leave-private-DOM, stale list/pin and remount fixes were made. Final source recheck was clear on keyed membership state and uncertain/denied lock/reload behavior.

## Cleanup and limitations

Disposable local reset verified `gate=false`, `hangouts=0`, `auth.users=0`, and private photo object rows `=0`. The temporary visual fixture file was removed; local web, Supabase and Lima were stopped, and the temporary VM mount removed. No hosted data or provider was touched.

The query detects full-result changes between its two requests and fails closed; a later transition remains subject to normal HTTP race limits and RLS on every subsequent read. Browsers can retain an already delivered private page in history/memory; future requests are reauthorized. The saved map was verified in no-token fallback, not against live Mapbox tiles. The dev-helper framework error remains an environmental test-path issue; built-server actual HTTP/action tests passed.

## Publication

Implementation branch is for coordinator review only. The coordinator owns NOW/BACKLOG/CURRENT_STATE/CHANGELOG and canonical main integration. This handoff will receive a pushed-commit receipt after the implementation commit is remote-verified; final branch tip is separately reported to the coordinator. No later task is auto-dispatched.

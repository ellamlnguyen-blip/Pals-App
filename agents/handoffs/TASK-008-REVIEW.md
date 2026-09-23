# TASK-008 coordinator review

Date: 2026-09-22
Reviewed task tip: `0ef4bbb67f5fab908092eba47243ebea3b394931`
Baseline: canonical main `aecb8a8982953e2a2c19b437a9c094f0cc1d031c`
Disposition: Accepted and integrated locally on remote-verified main `279c325384f5584e76e611ac78d722836ce47cff`; task ref `0ef4bbb67f5fab908092eba47243ebea3b394931` was independently verified.

## Scope and authorization
The reviewed diff adds a separate saved campus map/list/detail and caller-session join/leave actions. The existing mock map stays labeled and separate. No migration, RLS, hosted provider, service-role key, peer-profile reader, restricted visibility or launch control changed. Saved paths/actions check `APP_ENV=local`, the validated loopback Supabase target and live ready access; existing TASK-005 RLS and the default-disabled database gate remain independent controls. Public map data excludes private instructions. The detail reads them separately and rechecks state; the join/leave action returns no private payload and verifies persisted membership before success.

## Findings and resolution
A fresh read-only Sol review identified three actionable client issues: instructions remained displayed during uncertain leave; old results remained selectable while a viewport/filter query loaded; an earlier async marker render could repopulate stale pins. The implementer hid private instructions before a leave RPC, locked uncertain/denied actions until reload, cleared old results at query start and canceled stale marker work. A follow-up found that hidden instructions could remain hidden after a verified leave/rejoin; keying the control by authoritative membership state resolved it. The reviewer rechecked source and reported no remaining actionable issue in those paths. Coordinator also found and verified a small desktop detail link/badge spacing fix.

## Evidence and limits
`pnpm check` passed after final code. Two clean local resets passed 226 pgTAP assertions each and warning-free schema lint. The dev-server `pnpm test:auth:web` helper failed at Next 16 `/signin` with `Invariant: Expected workUnitAsyncStorage to have a store`; the equivalent three real Auth/Storage/Next HTTP/action/concurrency suites passed 3/3 against the built loopback server. Actual web cases cover saved search, 100-result truncation, private payload absence, join/leave/rejoin, host denial, closed/removed/cancelled and gate revocation. Coordinator inspected desktop and 390×844 phone views with a disposable ready local account: map fallback, list, preview/focus, host detail and no horizontal overflow. A second run with the previously authorized public Mapbox token verified a live desktop/phone basemap, one saved pin matching one list row, pin preview and focus return. Final local cleanup verified gate disabled, zero Hangouts/Auth users/photo objects; web, Supabase and Lima stopped.

The two-request recheck narrows stale public/private returns but cannot revoke information already delivered to a browser; every future database read is RLS-authorized. This remains local-only under Accepted ADR-0010. Hosted callback/email delivery, block precedence, reporting/moderation and deployment gates are still open. No later task was dispatched.

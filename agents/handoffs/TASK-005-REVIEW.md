# TASK-005 — Independent backend security review

Date: 2026-09-22
Reviewer: fresh `task005_sol_review`, GPT-6 Sol / medium, as requested by the user.
Coordinator: TASK-005 task; scoped implementation and test review.
Scope: reconciled Accepted ADR-0010 and backend-only TASK-005; no hosted operation or UI.

## Outcome
Fresh static review found no remaining blocking implementation finding after the fixes below. Final test/publication evidence is in `TASK-005.md`; a static review is not an independent runtime pass. The reviewer inspected the migration, role/grant matrix, SQL/API/race tests and engineering documentation. Coordinator independently inspected the same boundary and test assertions. TASK-006 owner profile/photo/CAS guards are unchanged.

## Findings resolved
- Creation could retain its initial readiness while waiting for an idempotency advisory lock. It now rechecks live readiness/campus/gate after the wait. Deterministic contention tests cover access/gate revocation while queued.
- Public roster policy initially called an ungranted arbitrary-subject helper. A caller-bound definer wrapper checks actual joined membership and permitted Hangout access; the internal subject helper remains non-executable by clients and mirrors canonical verified-email syntax/readiness.
- Stronger transaction isolation can retain obsolete readiness even after a lock wait. Hangout reads and mutations fail closed outside READ COMMITTED; existing identity/profile/Storage helpers are unchanged. Race tests exercise denied stronger-isolation reads/mutations.
- Creation replay now checks access to the original Hangout before reporting payload conflicts. Its private ledger uses a SHA-256 digest over normalized payload with epoch-normalized instants, preventing timezone-dependent retry mismatches. Original private instructions are never returned by replay.
- A nonparticipant could distinguish an existing cancelled Hangout through a state lookup returning null. The state RPC now enforces cancelled visibility and actual self-membership; unrelated callers receive generic denial.
- The seven-day end bound now exists in a database CHECK as well as RPC validation.
- Initial HTTP write-denial assertions used invalid column shapes. Final tests use valid column names and require the authorization error, so schema errors cannot substitute for permission evidence.

## Verified design boundaries
The database-controlled feature gate defaults disabled, is not client-writable, and participates in every exposed Hangout read/write/RPC. Campus public records, current-ready joined IDs and separately protected private instructions have distinct policies. Anonymous/cross-campus/nonready callers cannot use them; platform roles do not bypass access. Clients have no direct table DML. Host/campus/server fields cannot be supplied through mutation APIs. Restricted visibility, eligibility and co-host authority remain unavailable.

Public/private create and edit are transactional. A local test-only trigger forces failure after a public write to verify rollback of the public/private/membership/request state and revision. Owner-scoped request identity serializes duplicate creation; current authorization is rechecked before replay. Detail/lifecycle CAS rejects stale saves. All membership/lifecycle mutations lock the same Hangout row, preserving terminal cancellation, host membership and removal denial under overlap. Lost-response retry is recoverable after the original start passes.

## Limits
Blocking precedence, reporting/moderation, peer profiles/photos, hosted enabling/deployment and user-facing Hangout flows remain outside this task. Database snapshot checks cannot recall previously received data. Public location validation cannot prove host-supplied text or coordinates are nonsensitive; the later UI must guide safe approximate-area selection. No production data-retention policy or launch-readiness claim. TASK-003 hosted HTTPS callback/real UNC mail acceptance remains open.

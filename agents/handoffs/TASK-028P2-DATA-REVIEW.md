# TASK-028P2 DATA independent source review — 2026-10-06

Reviewed exact committed candidate `cafd6cb3022a65815138707110d533b9c28bf8b8` on `agent/TASK-028P2-rich-profiles`: migration `20261006000200_rich_peer_profiles.sql`, its pgtap and Auth HTTP tests, shared types, DATA handoff, Accepted ADR-0036/0037 and the rich-profile technical contract. Compared the consent lock graph with current pilot management, social mutation and direct profile-row-first write paths. No code was changed by this review.

## Disposition

**Conditional source clearance for persistence on the named disposable local database only.** I found no source-level blocker in the DATA migration. This does not clear hosted application, gate activation, gateway/UI wiring, or task completion. Before persistence, the coordinator must verify exact database identity and migration history as the DATA handoff requires. The runtime gates below remain pending.

## Security findings

- The new rich gate is inserted disabled and the private consent table has no backfill. RLS and explicit client-table revokes retain default privacy; new public RPCs revoke `PUBLIC`, anon and service role execute, then grant authenticated only. The internal lock helper has no client execute grant. Existing direct profile and Storage policies are unchanged.
- Both People and rich consent writers acquire social `(16016,1)` exclusive, pilot evidence `(16027,1)` shared, availability/capability, People/rich gates, actor account, then (for opt-in) Auth user, membership and campus before People/rich preference rows. This matches the accepted contract. Pilot management takes social then exclusive evidence before policy/account; direct profile UPDATE takes its profile row first and later shared evidence/account, while these consent writers never lock the profile row. I found no new account-to-social/evidence or account-to-profile edge.
- Rich opt-in checks active ownership, live ready campus tied to the locked membership, People consent, content publishability and enabled pilot/capability/People/rich policy after waits. Rich opt-out remains active-owner plus current CAS revision even when policy or eligibility is lost. People-off updates its own preference and clears rich consent/revision in one transaction. The shared social lock orders People-off against rich-on; either People-off wins and later rich-on denies, or rich-on wins and later People-off clears it.
- Rich detail uses a single `RETURN QUERY` SQL statement for authorization and projection. It checks both active accounts, both live confirmed Auth emails against current matching verified membership evidence and exact campus allowlist, same active UNC campus, pilot/capability/People/rich gates, both People preferences, subject rich consent, text publishability and bilateral blocks. The projection omits email and Storage paths and returns only selected opaque slot IDs and profile revision. Missing and denied subjects both yield zero rows. The existing People text RPC and raw-profile grants are unchanged.
- The pgtap suite reports 55 passing assertions in the DATA handoff's rolled-back transaction. It covers default-off, grants, CAS/no-op, People clearing, policy/eligibility/block revocation, and content denial. This is evidence for source/test coherence, not evidence of a persisted migration or HTTP/concurrency behavior.

## Required runtime gates after local persistence

1. Run the real Auth HTTP test through disposable API `55421`, including raw peer profile denial and default-off RPC behavior. The committed HTTP test covers this initial boundary; it does not establish a positive authorized rich read through real Auth.
2. Exercise committed-order People-off/rich-on and pilot-close/rich-on races from separate sessions, checking waits and both outcomes. Verify no deadlock for pilot management versus consent and direct profile-row-first UPDATE versus consent; safe aborts must surface as failure/retry.
3. Re-run focused SQL tests on the persisted migration and preserve the disposable fixture/gate state. Independently review the later photo resolver/gateway before local use. No actual photo authorization or image-byte behavior is cleared by this DATA review.

No database, hosted, reset, push or shared-queue operation was performed here.

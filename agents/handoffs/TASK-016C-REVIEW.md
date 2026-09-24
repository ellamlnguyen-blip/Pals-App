# TASK-016C independent review

Status: Corrections required; final exact-tip and rendered review pending
Date: 2026-09-23
Reviewed checkpoint: `cbfcbec19ac03ad4edf741c1592cfd1d60d89a5b`, independently remote-verified on `agent/TASK-016C-safety-ui`.
Reviewer: fresh GPT-6 Sol medium code/security agent; read-only exact-commit review. Runtime/browser remains with the implementation agent until explicit handoff.

## Checkpoint findings
1. Confirmed block/unblock leaves the dashboard outbound ID list stale until another focus/reload; refresh it after the confirmation closes.
2. Overlapping list-page requests share only the authorization generation and can overwrite newer rows/cursors; add per-list request ordering.
3. Direct chat renders safety controls before confirming source pair access. Backend authorization still denies arbitrary targets, but source controls must follow current or retained caller-specific authority.
4. Active verification users lack the required header Safety link.
5. Fetches invalidate stale responses but lack abort cleanup on hide/unmount. Aborting a fetch cannot reverse an already-dispatched database mutation; preserve truthful unknown outcomes.

No defect was found in cookie actor matching, no-store API headers, legacy writer denial, exact unblock false-result handling, UUID predecessor lookup, Unicode codepoint count, frozen report retry identity or opaque receipts. This does not replace final exact-tip verification after corrections.

## Evidence boundary
The committed built-server HTTP suite covers stale API payloads, actor mismatch, exact block/unblock, denied targets, same-key report retry, changed payload and local rate limit. Broader lifecycle, uncertain-response, rendered and concurrency evidence is still being completed. No final acceptance or unqualified verification claim is made here. The B notification fixture transient remains a separate unresolved maintenance item.

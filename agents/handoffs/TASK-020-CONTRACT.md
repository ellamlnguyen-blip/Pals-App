# TASK-020 planning handoff

Date: 2026-09-25
Status: Documentation-only planning; explicit ADR-0024 acceptance required before implementation
Baseline: canonical remote main independently queried at `8c087fa396475f966a3a783307719e4d625f60e2`
Branch: `agent/TASK-020-large-hangout-plan`

## Result

Read AGENTS, NOW/BACKLOG/CURRENT_STATE, TASK-019 handoff and relevant accepted product, safety, data, authorization, map/UX and ADR sources. A fresh GPT-6 Sol medium read-only scope audit confirmed the five required basic safeguards and the unset threshold, disclosure, hook and ranking policies. Existing host close-joining authority is already accepted; co-host implementation remains TASK-010. ADR-0019's report-only queue precludes silently adding size-based operator review.

The parent contract stages backend then student UI, each with its own future reviewed contract and fresh agent. Proposed ADR-0024 recommends 25 joined membership rows including the host, a coarse host-only warning, voluntary close/reopen, one private signal per Hangout/policy version and viewer-visible-roster-based saved-map priority before truncation. The signal is explicitly unconsumed and grants no operator access or sanction authority. Hosted operational review remains separately blocked. User acceptance of this proposal will authorize temporary synthetic-local QA gates with reset/false-gate/service cleanup; no enablement occurred in planning.

## Review and verification

Independent GPT-6 Sol medium planning/security review identified one P2 wording conflict: host-only current UI scope could appear to narrow Accepted ADR-0012's future co-host joining authority. The corrected proposal and contract explicitly preserve that authority and require reconciliation if TASK-010 lands before dispatch. The proposal also preserves gate-off query filters, the 101-row probe, time/ID ordering and live revalidation. Final independent re-review found no remaining P0/P1/P2 and cleared documentation publication and the acceptance request; it did not approve implementation.

`git diff --check` passed; proposal, contract and shared records are consistent. No runtime tests are claimed for a documentation-only change. No implementation agent, database runtime, fixture or app server was started. All existing default-off gates remain unchanged; no hosted access occurred.

## Publication and next action

Publication is pending. Publish the reviewed documentation task branch, integrate into canonical main without rewriting history, and independently query both remote SHAs. Then request explicit acceptance of ADR-0024. The parent TASK-020 remains incomplete; no successor task may be created on the basis of this planning milestone alone. After acceptance is published, prepare/review A's exact backend contract and lock/projection specification before dispatch; B waits for reviewed A integration.

Agents used GPT-6 Sol with medium reasoning as requested. Dispatch tools expose no Standard-speed selector; no speed configuration or verification is claimed.

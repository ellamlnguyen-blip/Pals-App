# TASK-018 planning handoff

Date: 2026-09-24
Branch: `agent/TASK-018-planning`
Baseline: independently read-only remote-verified `origin/main` `be0344ed8b1f9dbef49a6246575ca8d8dd3bccc6`

## Outcome

Defined the bounded attendance-confirmation contract and Proposed ADR-0022. The proposal chooses private self-reporting, an attendance-owned ID-only list, database-enforced timing and post-opening schedule freeze, revision-safe correction, and explicit block/moderation privacy precedence. Stage A backend and Stage B student UI remain undispatched pending explicit ADR acceptance and narrower stage contracts. No schema, permissions, UI, gate state or hosted environment changed.

## Review

A fresh GPT-6 Sol medium planning reviewer found three initial policy gaps: mutable schedule could move an answered window; hidden source discovery depended on the safety gate; identical retries conflicted with stale revision language. The draft was corrected with a post-opening schedule freeze and parent-lock recheck, an attendance-owned bounded ID list, and current-value no-op precedence during the open window. The reviewer then found a remaining wording issue about exact deadlines for hidden sources. The final draft limits those screens to a general 30-day rule plus open/closed state and allows an exact deadline only through independent source authorization. No remaining P0/P1 finding was reported before that final wording correction; the correction is a narrower privacy-preserving clarification. Standard speed is an app preference; the dispatch tool did not expose a speed control or verification.

## Verification and remaining gates

Planning-only diff review and `git diff --check` passed. This checkout has no installed Prettier binary; runtime tests are not relevant to documentation-only changes. Explicit user acceptance of ADR-0022 is required before any attendance migration or permission implementation. Narrow Stage A/B contracts, fresh task agents, local tests/rendering, exact-tip reviews, handoffs and canonical integration remain. Hosted operations, production data and gate enablement remain excluded.

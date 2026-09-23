# TASK-012 — Local friendship requests

Status: ADR-0014 accepted; TASK-012A contract publication precedes backend dispatch
Date: 2026-09-23
Planning branch: `agent/TASK-012-planning`
Starting canonical `origin/main`: `a4a011e2026d4ab6c9eb41c9d2381b7be123da81` (freshly verified with `git ls-remote origin refs/heads/main` after sandbox escalation)

## Goal and boundary
Let two eligible UNC students explicitly form, inspect and end a mutual friendship through the existing opted-in People experience in disposable local development. This is relationship infrastructure, not friend-aware Hangout discovery or restricted access.

## Dependencies and required context
- TASK-003 live readiness, TASK-006 owner-only profiles, TASK-011 text People/People-only blocks and Accepted ADRs 0007, 0009–0011, 0013 are integrated. Read `AGENTS.md`, NOW/BACKLOG/CURRENT_STATE, MVP/PRINCIPLES, ARCHITECTURE/DATA_MODEL/AUTH/AUTHORIZATION/SECURITY_AND_SAFETY/TESTING, UX USER_FLOWS/INFORMATION_ARCHITECTURE/SCREEN_INVENTORY/DESIGN_DIRECTION, existing migrations, People routes/actions and local target guards.
- TASK-010/Proposed ADR-0012 remain blocked and independent. Existing Hangout access from ADR-0010 is unchanged. Friendship never authorizes friends-only, invite-only, eligibility-restricted or private Hangout access in this task.
- Publish this reviewed contract, Proposed ADR-0014 and queue/status/handoff on canonical main before implementation dispatch. Publication is not acceptance. Record explicit user acceptance of ADR-0014's request, suppression, reader and block interaction rules before any migration or new peer reader.

The contract was reviewed and published on remote-verified main `797961b4a3eda51a2fa7e2b9bd0d1bfdf291f913`. The user then explicitly accepted ADR-0014 on 2026-09-23. This decision does not expand hosted or restricted-Hangout scope; the narrower TASK-012A contract still must be published before dispatch.

## Stages after acceptance
1. **TASK-012A state and authorization**: fresh bounded agent/branch. Add an additive local migration for canonical mutual pair, immutable request-generation IDs, caller-scoped creation idempotency ledger, pending/accepted transitions and private suppression; default-disabled friendship gate; caller-bound read/action APIs with narrow grants and pair-lock concurrency. Extend the existing People block mutation narrowly so a newly committed block also ends that pair's pending/accepted friendship atomically, including while the friendship gate is off, and a current relationship participant can block a now-hidden peer by ID under the proposed exception. Preserve all other People gate/opt-in/block checks, owner-only profile/Storage and current Hangout RLS. Add meaningful actual-role SQL, real caller-session HTTP and race tests. No UI, notifications or hosted work. Fresh independent security review, handoff and verified main integration before B.
2. **TASK-012B People friendship UI**: fresh bounded agent/branch. Add request action only to currently visible opted-in People detail, honest incoming/outgoing/accepted state and recipient accept/decline, requester cancel, either-side unfriend. Use relationship IDs plus currently authorized People text; show neutral unavailable state when text access is lost. Confirm irreversible decline/unfriend implications and uncertain action results; handle loading/empty/error/denied/stale responses. Before substantial UI, read the installed `design-taste-frontend` skill, inspect `https://usepals.com/`, tokens/components and relevant UX docs, then write an interaction/visual plan and verify rendered desktop/phone/keyboard states. No new permission or schema. Fresh security/design review, handoff and verified main integration.

## Out of scope
Friend-aware ranking, mutual friends, public counts/lists, peer photos/new text fields, DM/chat, invitations, notifications, attendance context, eligibility/restricted Hangouts, global Hangout/private-location block precedence, reports/moderation, campus transfer, hosted deployment/migration/enablement, live accounts and unrelated test-helper fixes. TASK-016/017 and hosted safety gates remain open.

## Acceptance criteria for this bounded increment
- [ ] ADR-0014 explicitly accepted and published; narrower A/B contracts published before dispatch; A independently security-reviewed/integrated before B.
- [ ] One mutual pair only; requester/recipient transitions, immutable generation checks, creation-key retry after accept→unfriend, stale transitions after a new pair, duplicate/opposite requests, decline suppression, block teardown and no automatic resurrection behave exactly as accepted.
- [ ] New requests and acceptance enforce live ready same-campus opt-in and bilateral People-block eligibility in the database; owner-only cancellation/decline/unfriend remain usable under the proposed narrower conditions. Gate false and lost authorization fail closed.
- [ ] Each participant sees only their own IDs/status; every displayed peer field comes from a fresh ADR-0013 projection. No raw profile/photo, hidden-person detail, counts, platform bypass or Hangout/private reader expansion.
- [ ] SQL/RLS/grant, caller-session HTTP/action and pair-race tests cover forged actor/target, reverse block, a now-hidden current friend/requester block, block while the friendship gate is off and after re-enable, opt-out, readiness/campus/account/gate changes while waiting, lost responses, stale generation after teardown/new request, stronger isolation denial, route/cache behavior and unchanged People/Hangout/profile regressions.
- [ ] Desktop/phone/keyboard and loading/empty/error/denied/uncertain states are verified. Fixtures cleaned, gates false and local services stopped. Stage/parent handoffs, NOW/BACKLOG/CURRENT_STATE/CHANGELOG and both remote refs are verified before completion.

## Ownership and handoff
The coordinator owns shared queue/state, policy acceptance, narrower dispatch, review and integration. Stage agents own only their contracts and handoffs, then stop. Use `agents/HANDOFF_TEMPLATE.md`. Planning handoff: `agents/handoffs/TASK-012-CONTRACT.md`. Planning validation is document consistency/scoped diff/review only; it is not runtime, UI, policy acceptance or task completion. Use GPT-6 Sol medium at the app's Standard speed preference for task/review agents; dispatch tooling has no speed selector, so do not claim speed verification. No automatic successor task until this bounded parent task is actually complete.

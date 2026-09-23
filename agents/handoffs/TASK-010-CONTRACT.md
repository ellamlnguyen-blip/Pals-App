# TASK-010 planning handoff

Date: 2026-09-22
Branch/worktree: `agent/TASK-010-planning`, `/Users/ellanguyen/.codex/worktrees/d3e6/Pals App`
Verified starting canonical main/origin: `49d6e780aebf5f23f384efe24d0a8bd55232888a`
Status: Planning prepared; policy acceptance required, implementation not dispatched

## Outcome
Read current AGENTS, queues/current state, TASK-005/007/008/009 contracts and delivery/review evidence, Accepted ADR-0010 and relevant product, authorization, safety, data-model, architecture, testing and UX/location specs. Confirmed clean canonical main and task worktree, fetched origin and verified remote main before creating the bounded planning branch. The initially provisioned detached worktree was stale at TASK-002; it was advanced to canonical main before planning changes.

Added TASK-010's contract and Proposed ADR-0012, with shared NOW/BACKLOG/CURRENT_STATE/CHANGELOG records. No code/schema/runtime/hosted changes. Co-host powers remain unimplemented and unauthorized until the user explicitly accepts the proposal. Backend and UI will receive separate bounded contracts and fresh agents; backend review/integration precedes UI dispatch.

## Proposed policy for user decision
Host retains cancellation and delegation. Co-host may edit accepted public/private details, control joining and remove current-ready ordinary joined attendees; never host/other co-host. Host promotes an existing ready joined member immediately; co-host may step down or leave. Demotion keeps participant private access, whereas leave/removal/cancellation/readiness loss revokes future reads. Readiness loss suspends rather than deletes assignment; restoration can restore authority if still assigned/joined. Public role labels cover only existing current-ready roster IDs; a host-only current-assignment list permits revoking nonready retained co-hosts. No peer identity/photo access.

These are recommendations, not accepted policy. ADR-0012 records alternatives and has no acceptance evidence yet. Existing host/nonhost leave and removal semantics after cancellation remain explicit exceptions to published-only management. Local additive migrations would become authorized only with policy/contract acceptance; no hosted operation follows from that acceptance.

## Review and verification
Fresh read-only `task010_policy_review` reviewed the proposed contract/ADR against specs and actual migration. Three clarifications were identified and applied: a host-only retained-assignment reader for nonready co-host revocation; preserved cancelled leave/host removal and left-member removal; replacement of the old revision-free removal RPC rather than a bypassable overload. Final reread disposition: clear, all three findings resolved; no remaining blocking policy or staging finding. This is a documentation review, not acceptance of product policy. Coordinator independently inspected existing lifecycle/state/removal RPCs and source-of-truth conflicts.

Documentation diff and whitespace checks only; no runtime tests are claimed or needed for this documentation-only proposal. Calendar's existing local checks and known failing CI/dev-helper evidence remain historical baseline, not new TASK-010 results. Local services were not started.

## Remaining work
Publish/remote-verify reviewed planning branch and main; request explicit user decision on linked ADR; record acceptance/revisions on main. Only then publish stage A contract and dispatch fresh backend implementation, independent security review and integration; stage B follows under its own contract. Preserve default-disabled gate/disposable-local boundary, separate mock/saved records and all hosted safety/auth/deployment prerequisites. CI helper maintenance stays separate.

## Publication receipt
Pending reviewed planning publication. This does not mark TASK-010 implementation complete.

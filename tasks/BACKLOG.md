# Backlog
## Product Build
- TASK-007 create/edit Hangouts — complete locally; see `DONE.md`, its contract and handoffs. Hosted enablement remains gated on separate safety/deployment work.
- TASK-008 map discovery/detail/joining — complete locally; see `DONE.md`, its contract and handoffs. Hosted safety gates remain open
- TASK-009 calendar
- TASK-010 host/co-host management
- TASK-011 people discovery
- TASK-012 friendship
- TASK-013 hangout chat
- TASK-014 DM requests/direct chat
- TASK-015 notification inbox/preferences
- TASK-016 blocking/reporting
- TASK-017 admin moderation console
- TASK-018 attendance confirmation
- TASK-019 PostHog instrumentation
- TASK-020 large-hangout basic safeguards
- TASK-021 staging launch rehearsal
- TASK-022 domain migration/cutover

## Later
Expo mobile; native release pipeline; organization accounts; polls; optional capacity/waitlists; multi-campus.

Unrelated technical debt discovered during work becomes a separate task here.

## Hangout access dependencies
Friends-only, invite-only and eligibility-restricted Hangouts remain disabled until accepted, tested access rules use authoritative friendship, invitation and deliberately supplied profile attributes. TASK-012 supplies friendship; invitation/eligibility enforcement still needs separately bounded contracts. TASK-016 block precedence/private-access rules and TASK-017 audited moderation remain safety dependencies before launch. Accepted ADR-0010 permits only disposable local Hangout work until those hosted-use gates are resolved; do not infer access policy from absent data.

TASK-003 deployed HTTPS callback and real UNC email delivery acceptance remains independently open in NOW.

## Engineering follow-ups
- CI maintenance: review Node 20 runtime deprecation annotations for checkout/setup-node/pnpm actions and the announced ubuntu-latest runner migration. TASK-006 CI passes; update action/runtime pins in a separate bounded maintenance task, not profile scope.

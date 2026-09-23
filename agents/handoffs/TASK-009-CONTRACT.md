# TASK-009 planning handoff

Date: 2026-09-22
Branch: `agent/TASK-009-planning`
Verified starting canonical main: `e2e3b2d0b59d32100dfca91c04801b96d551f5ab`

## Outcome
Established the bounded Calendar contract and NOW/BACKLOG/CURRENT_STATE/CHANGELOG planning records before dispatch. TASK-005/007/008 are reviewed/integrated; Accepted ADR-0010 and actual local/API boundaries remain authoritative. No implementation or hosted change in this planning increment.

## Decisions
Today/day and Monday–Sunday Week use America/New_York boundaries. Public-only Calendar reads include discoverable, caller-joined and caller-hosted filters; cancelled rows are limited to authorized personal views. No friend-context claim, private payload or expanded policy. Existing detail owns joining/private instructions. No new product/authorization decision requires an ADR in this read-only increment.

## Next
Publish/verify planning branch and canonical main, then dispatch a fresh bounded implementation agent from that main. Require interaction plan, actual local permission/temporal tests, rendered desktop/phone checks, independent review and handoff. Coordinator retains shared records and integration ownership. Known dev-helper regression remains a separate maintenance task; built-loopback verification is available.

## Publication and dispatch receipt
`git ls-remote` independently verified planning and canonical main at `29c9343edc560dd0731804b3b9624f8329ad6d4c`. A fresh implementation agent was then dispatched on `agent/TASK-009-calendar` from that exact origin/main baseline. Coordinator API review confirmed cancelled participant rows are hidden by roster RLS; personal cancelled results must use existing authorized public-row access, not broaden roster policy. No additional prerequisite or permission change is needed.

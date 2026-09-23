# Handoff — TASK-015C Notifications UI contract

Date: 2026-09-23
Coordinator branch: `agent/TASK-015C-contract`
Starting canonical `origin/main`: `b902b9168543e15b78e3eca5f21281eb83563782` (reviewed TASK-015B integration, remotely verified)
Policy/backend: Accepted ADR-0017; independently reviewed and integrated TASK-015A/B

## Outcome
Prepared a separate student Notifications inbox/preferences UI contract and interaction/visual plan. It uses the private A/B caller-bound projections, current-source destination authorization, local-only/no-store web routes and transition-safe state handling. No UI code or hosted action is included in this contract publication.

## Design context and review
The coordinating session read the installed `design-taste-frontend` skill, project UX direction/tokens/current components and inspected the live `usepals.com` on 2026-09-23. The plan keeps the existing bright blue/white rounded Pals language and accepted Hangouts · Calendar · People · Chats · Notifications navigation. A fresh independent GPT-6 Sol medium security/design contract review found three clarifications: friendship navigation is a generic paginated landing, existing primary-nav surfaces define the link-update scope, and every failed/uncertain refresh must keep rows masked. These were corrected and re-reviewed with no remaining publication blocker. This clears the contract, not implementation.

## Remaining work
Publish reviewed contract and plan on canonical main, verify task/main remote SHAs, then dispatch a fresh bounded UI agent. After rendered/privacy checks and its handoff, perform fresh exact-tip security/design review and integrate only accepted work. TASK-010/ADR-0012, TASK-016 global safety, Realtime and hosted gates remain open.

# Handoff — TASK-015B source-event contract

Date: 2026-09-23
Coordinator branch: `agent/TASK-015B-contract`
Starting canonical `origin/main`: `b38081be26993d060aa4b29e945498503a7135d3` (TASK-015A reviewed integration, remotely verified)
Policy: Accepted ADR-0017

## Outcome
Narrowed the second backend stage to public Hangout edit/cancellation/join/leave and Hangout-chat message event hooks, extending TASK-015A's private ledger and reader. UI remains separate TASK-015C. No schema or source code changes are included in this contract publication.

## Independent review
A fresh GPT-6 Sol medium read-only reviewer checked the actual Hangout/chat migrations and TASK-015A ledger. Review identified that a former participant can still read a published public Hangout, so an old edit notification must require current joined membership before exposing its code/link. It also required material edit comparison after the private-instruction write and observed parent-row race tests for leave/removal/cancellation versus edits/sends. All are explicit in the revised contract; the reviewer re-read it and found no remaining publication blocker. This is contract review only, not implementation verification.

## Remaining work
Publish the reviewed contract on canonical main and verify task/main remote SHAs. Dispatch a fresh bounded TASK-015B agent only afterward. Independently review and integrate B before publishing/dispatching the Notifications UI contract. TASK-010/ADR-0012, TASK-016 global safety, Realtime and hosted gates remain open.

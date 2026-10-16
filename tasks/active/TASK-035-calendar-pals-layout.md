# TASK-035 — Compact Calendar and Pals controls

Status: active, explicitly requested by Ella on 2026-10-16 from local browser comments. Canonical baseline `e15215d17d291ebfd2dac14847b75ba4e0747a28`; exact reviewed disposable-local application dependency `70537ad702d536013e711d75e64578db34cdc4ce` on `agent/TASK-034-pals-chat-discovery`. TASK-032/033/034 remain incomplete at their recorded release/application-main gates. No hosted change is in scope.

Local candidate: reviewed and pushed on `agent/TASK-035-compact-controls` at remote-verified `287e3faba359dfd49c713abf1533efb06a6cb49d`. Build/TypeScript, 1280/767/375px browser rendering, focused interactions and no narrow page overflow passed. Still active until accepted parent dependencies and application-main integration gates resolve; see `agents/handoffs/TASK-035-STATUS.md`.

## Requested outcome

- Calendar: remove the visible page `Calendar` h1. At the shown narrow desktop/tablet width, compact the category legend and Day/Week/Month tabs so they sit on opposite sides of the centered date range in one row, with visible breathing room around the range. Keep previous/Today/next and the date picker usable below. At phone width, adapt without overflow or clipped controls; retain accessible Calendar page name and legend/view semantics.
- Pals: place the major/year filter beside `Discover your next Pal!` as a smaller secondary element at the shown width. Use the same heading blue as other primary app headings. Replace the numeric graduation-year input with a native select and an “Any year” choice; preserve valid existing year deep links. Major placeholder becomes “Major”. Keep the native filter submission, current server validation/paging/authorization and full-profile links.

## Boundaries and acceptance

Only Calendar and Pals presentation/form files plus focused UI verification and this task's handoff/evidence. No schema, RPC, ranking, consent, auth, source-gate, shared tokens unless strictly necessary, or unrelated copy edits. No ADR is required for this presentation-only change.

Read AGENTS, this contract, design direction, existing tokens/components and installed design-taste-frontend skill; attempt the live reference. Plan responsive behavior before editing. Use a fresh GPT-6 Sol medium task agent for implementation; coordinator reviews and renders after handoff. Verify production web build/TypeScript and rendered 1280, 767 and 375px Calendar and Pals states; inspect Day/Week/Month, filter submission/clear, preselected year deep link, keyboard/label access and no horizontal overflow. Capture screenshots and record real limits. Keep application code on the TASK-035 branch until parent sign-off/dependency gates; publish status-only records to canonical main.

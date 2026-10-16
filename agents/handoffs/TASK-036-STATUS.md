# TASK-036 local status receipt

Status: reviewed local presentation candidate published; TASK-036 remains active.

- Contract and source baseline: canonical main `c8a65f2ce907bbc2d805d5f1e221ae2c97932330` and reviewed local TASK-035 dependency `287e3faba359dfd49c713abf1533efb06a6cb49d`.
- Implementation branch `agent/TASK-036-chat-reference-ui` is independently remote verified at `1fac4f67a8cd8b57140eff60eaf8ba2c3923b7c7`. Source, detailed `agents/handoffs/TASK-036-UI.md`, and 1280/375px screenshots are on that branch. This main receipt contains only task/status documentation.
- Full production web build including TypeScript passed in the named disposable runtime. Eight focused chat tests, formatting and diff checks passed. Authenticated local browser inspection covered index, Hangout and direct request routes at desktop/phone widths; no horizontal overflow. Selected row, mobile navigation, genuine empty/request states, draft-enabled Send, and reachable poll controls were observed. No message was sent. Existing loading/error/denied branches could not be forced with the available fixture.
- The current UI uses the existing unified inbox and actual authorized Hangout/DM records. Example faces, messages and counts in the supplied image were not invented. The existing header remains consistent with later explicit user requests.
- Remaining: resolve TASK-032/033/034/035 signoff and integration gates, then review this exact candidate with accepted dependencies for application-main integration. No hosted operation, database migration, permission change or completed-task claim.

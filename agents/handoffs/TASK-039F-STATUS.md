# TASK-039F Block diagnosis status

Date: 2026-10-16. Outcome: inconclusive; TASK-039D remains incomplete.

The independently verified remote `agent/TASK-039F-block-diagnosis` tip is `3cfd3952fa6b2ba70ba6acca860110c7a81062a5`. Its detailed handoff and evidence are `agents/handoffs/TASK-039F-BLOCK-DIAGNOSIS.md` and `agents/evidence/TASK-039F-block-dialog/` on that branch. Canonical main baseline was `a73adf4`; reviewed TASK-039E source `ea9befb` was merged locally at `2b583bad`. There is no task-scoped application source difference after that merge: only handoff/evidence was published.

The task-owned Supabase stack applied 52 migrations and supported real synthetic confirmed accounts, caller-bound friendship and DM data. The browser's SSR profile loaded, but client safety and DM requests returned 403 before Block controls rendered. A temporary diagnostic attributed the denial to `cookies was called outside a request scope` inside `access()` during API handling. This result does not prove why TASK-039D's separate browser run clicked an enabled Block button and found zero dialogs. A focus/epoch reset is a source hypothesis only. No safety source, permission, schema or shared/hosted target was changed. All task-owned processes, containers, volumes, network and credentials were removed.

Next verification must use a task-owned browser runtime with successful client API request scope, then instrument Block click, dialog mount, native modal and focus/epoch sequence on active and stale chats plus peer profile. TASK-039D/039 and application-main/release gates remain open.

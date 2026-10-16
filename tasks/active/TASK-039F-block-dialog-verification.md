# TASK-039F — Diagnose Block confirmation in Chats and peer profiles

Status: ready for bounded disposable-local diagnosis after this contract is published on canonical main. Parent TASK-039D is incomplete: the Block button was enabled, but its confirmation dialog did not remain in the browser DOM in three cases. This may be a browser focus/context effect or a source defect; neither is assumed. Start from current canonical main plus exact reviewed TASK-039E source `ea9befb4068662956a4492ea0a607bd966afb109` and TASK-039D evidence `1ec016379fef388ad24429b6853a03ff3022b440`. Keep TASK-040 code outside this task unless needed only in a task-owned QA copy.

## Scope

Review `agents/handoffs/TASK-039D-RESUMED-BROWSER.md` and its active/stale Block DOM and console evidence. Reproduce the Block button behavior in a separate task-owned authenticated browser context with synthetic verified-campus users; distinguish button event, modal mount, native `showModal`, focus/visibility/epoch reset, and cross-tab cookie effects. Test active DM, stale DM and peer-profile entry points. Preserve exact target-ID confirmation, permission denial and report behavior. If source defect is proven, make the smallest safety UI correction and add a meaningful focused regression, then verify dialog open/cancel/keyboard behavior in real browser. If source is sound and the failure was the browser harness, record evidence and rerun the TASK-039D Block gate. A controlled thread error-state check may be included only if it does not broaden the fix.

No application source change is authorized merely to make a test green. Do not weaken safety verification, RLS, DM consent or target confirmation. Use separate task-owned Supabase/web ports and synthetic data; do not touch shared `pals-local`, TASK-028/029, user-open 3035, TASK-039D cleaned target or hosted systems. Temporary local endpoint/origin substitutions may be made only in a disposable QA copy with an exact diff/hash record; committed auth/DM implementation must remain unchanged.

## Verification and handoff

TypeScript/build plus a focused test if source changes; actual authenticated desktop/phone confirmation behavior, cancel/close/focus and neutral stale-route checks. Fresh independent safety/source review of any fix. Capture durable evidence, stop task-owned runtime, commit/handoff/push task branch and independently verify remote SHA. Coordinator publishes outcome on main and resumes TASK-039D only if this gate genuinely passes. Predecessor application-main/hosted gates remain open.

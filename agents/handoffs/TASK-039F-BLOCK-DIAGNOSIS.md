# TASK-039F Block confirmation diagnosis — incomplete

The Block dialog cause is **unresolved**. TASK-039D's enabled-button, zero-dialog result could not be rerun to a click in the task-owned browser runtime. No application source was changed, and TASK-039D must stay incomplete.

The isolated Supabase project applied 52 migrations and supported two real synthetic confirmed UNC Auth users. Caller-bound access, People, friendship, and accepted friend-DM projections worked. In both browser surfaces the account's server-rendered profile loaded, but all relevant client API routes denied before rendering safety controls. A temporary diagnostic in the disposable runtime showed `cookies was called outside a request scope` during the safety API's `access()` call. This is a concrete setup/runtime blocker and does not prove an application Block-modal defect or a cookie/focus artifact in TASK-039D. [Evidence](../evidence/TASK-039F-block-dialog/browser-attempt.md) records the setup, limitations, exact temporary diffs, and cleanup.

Source review identified a possible focus/epoch race in `SafetyActions`, but there is no click-to-epoch trace. In keeping with the task contract, no speculative safety UI change was committed. A focused test, TypeScript/build after a fix, independent fix review, 811/375 dialog open/cancel/keyboard/exact-ID checks, and permission-revocation checks remain pending because there was no fix and no browser click.

The task-owned web process and Supabase project were stopped; no owned container, volume, network or web listener remained. No shared or hosted target was touched. This branch contains only this incomplete handoff and its evidence. The coordinator should record the blocker on main and retain TASK-039D as incomplete. Before any further Block-source work, use a browser runtime whose client API request scope succeeds with the same synthetic actor, then instrument Block click, modal mount and epoch/visibility events. Standard speed was not exposed by this dispatch tool and was not verified.

## Publication receipt

The initial handoff/evidence commit `54e41ade21e13138956f9eb6ee7fd3b15576ca7a` was pushed to `origin/agent/TASK-039F-block-diagnosis`; independent `git ls-remote` returned the same SHA. This branch began from canonical-main SHA `2b583badc7e205ee9ccd462cc711e3921c6aca17`. This receipt update has its own subsequent commit and remote verification, reported to the coordinator. No code can be accepted or integrated from this incomplete diagnosis.

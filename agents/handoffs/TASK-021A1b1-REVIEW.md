# TASK-021A1b1 independent source review

Date: 2026-09-27
Status: **Corrected source cleared at 8cc3480775687bcd679db086c6dc802bb4a3dc7b; final runtime/handoff/exact-tip review pending**

Reviewed exact local unpushed implementation `9470eb8b832c8e31811cb555647d509d33b8920f` in `/private/tmp/pals-task021a1b1-owner-admission`, branch `agent/TASK-021A1b1-owner-admission`. Fresh independent GPT-6 Sol medium agent `review_pilot_owner_admission_implementation`; Standard speed app-controlled, not verified by dispatch API. Read-only source review, no runtime operation. Reviewer could inspect committed predecessor definitions but did not have the later documentation-only dispatch receipt SHA locally.

P1: `private.pilot_lock_owner_evidence()` membership locking lookup may return no row after an independent deletion wins a wait, then a concurrent independent insertion can commit before the fresh eligibility check. That check could authorize against a new membership/campus not locked through commit. Account SHARE permits membership FK KEY SHARE; pilot advisory excludes management writers, not independent membership writers. Fail closed on absent locked membership/campus and bind fresh verification to the exact locked campus; add deletion/recreation evidence. Coordinator conveyed this to executor and requested considering missing required evidence consistently.

Otherwise source inspection aligned with six-state precedence, caller-only onboarding eligibility, private arbitrary-subject readiness, minimal grants, unchanged trusted provisioning, and retained photo ownership/reference/revision protections. Actual trigger order: profile revision, admission, photo validation; Storage DELETE protection, admission. Protector obtains profile first. Existing crossings may abort safely and do not imply universal deadlock freedom.

Runtime SQL/Auth/PostgREST/Storage roles, observed holder/waiter evidence, cleanup/default census, final handoff and corrected exact-tip security review remain pending. No implementation publication/integration or completion. B2/B3/A1c/A2 and TASK-021 remain incomplete; no hosted/pilot-ready claim.

Correction re-review: exact `8cc3480775687bcd679db086c6dc802bb4a3dc7b` cleared with no remaining actionable source finding. Every required locking lookup now denies immediately when absent; final fresh verification binds membership to the campus obtained from the locked membership. Newly inserted evidence cannot substitute for absent locked rows. No runtime operated by reviewer.

Reviewer accepted the described missing-roster equivalent coverage: prior statement snapshot sees active roster, actual management exclusive pilot boundary deletes it, direct write waits, deletion commits, trigger sees absence and denies without mutation; initially absent fresh RLS request changes zero rows; authenticated management activation from revision0 permits a later fresh write. Already-absent RLS snapshots cannot reach the BEFORE trigger. Shared evidence excludes management insertion until transaction completion. This is not an observed activation-versus-owner wait or both activation commit orders. Labels and original contract mapping must be precise in final handoff.

Executor reports initial32 SQL assertions, HTTP1/1 and59 observed waits; changed fixtures, final source/test evidence, upgrade/regressions/static/build/cleanup and final exact-tip handoff review remain pending. No publication of implementation or completion is implied.

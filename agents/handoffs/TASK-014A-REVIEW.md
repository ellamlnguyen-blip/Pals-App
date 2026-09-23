# TASK-014A exact-tip security and evidence review

Date: 2026-09-23
Reviewed branch: `agent/TASK-014A-dm-backend`
Final independently remote-verified task tip: `eb5259e521df86d17e8cc5d01c69e4ae8b90f57b`
Coordinator merge before publication: `993aa005da087977157780b7a597e90529333329`

## Outcome
Fresh GPT-6 Sol medium read-only security reviews found no remaining authorization or privacy blocker at the final exact tip. The first review cleared the core private-table grants, caller identity, bilateral People eligibility, pair serialization, block teardown and terminal denial, but identified incomplete campus semantics and race evidence. The implementer removed the unintended formation-campus restriction from accept/send and added new-campus, ignore/reply and opposite-create/block checks. A fresh second review cleared the corrected code and identified the remaining DM-specific revocation and in-flight read evidence gap. A fresh final exact-tip reviewer confirmed the added observed-lock test closes that gap for both gates, account status, primary photo, campus membership, People opt-in and subsequent body denial. No production SQL changed in that last follow-up.

## Verification and limits
The implementer reports a final clean local reset, all eight SQL suites with 46 passing DM assertions, eight real Auth/HTTP/concurrency suites, warning-free schema lint and `pnpm check`. The exact final test diff, handoff and cleanup claims were read-only reviewed; reviewers did not rerun local services. The `db:test` wrapper could not bind-mount the isolated `/private/tmp` checkout into Lima, so SQL suites ran directly against the validated disposable local container. Confirmed-email changes and photo-object deletion were not individually raced; the locked evidence path and other representative races were inspected. All five local feature gates false, DM fixtures zero, no direct client grants/Realtime publication and Supabase/Lima stopped were reported and recorded in the implementer handoff. No hosted/CI claim.

## Integration decision
The exact reviewed backend, tests, docs and implementer handoff are eligible for canonical main publication. TASK-014B must wait for independently remote-verified main and its own reviewed, published contract. ADR-0016 remains local-only; TASK-016 global blocking/reporting, Realtime and hosted gates remain open.

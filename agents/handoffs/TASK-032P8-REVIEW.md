# TASK-032P8 fresh review

Candidate reviewed: `25ba280b30248e7622635dc24baeb185952df70b` against baseline `57bbacb1b88b4ca1f05527e1a76e0561ad218212`.

## Scope and outcome

Read the task contract, Proposed ADR-0041, complete candidate diff, header and inbox lifecycle, notification API, attention migration and pgTAP fixture, existing notification emitters, list/read authority, and account-write trigger. The owner-only attention RPCs use the existing gate and recipient lock order. Acknowledgment filters by authenticated recipient and snapshot cutoff; later emitter arrivals remain outside that cutoff.

The earlier finding that a second uncaught `access()` call could fail an otherwise authorized page is resolved in `apps/web/app/components.tsx`: the additional actor lookup now catches failure, keeps the page and header controls rendering, and omits an unverified badge actor. The known 403 reload loop and silent acknowledgment failure were addressed in the preceding follow-up commit. No remaining concrete permission, race, or lifecycle defect was identified in this read-only review.

## Checks and limits

- Inspected the source diff and latest follow-up fix; `git diff --check` passed at the reviewed commit.
- Did not execute browser, database, lint, typecheck, unit, or build tests as reviewer. The coordinator reported a disposable-local pgTAP rerun of 15/15; runtime and browser verification remain with the coordinator.
- This review does not authorize hosted migration/application or accept Proposed ADR-0041.

## Follow-up at `f2a4b4cca1f56d22a1edd888202563d71a79b041`

Reviewed the two follow-up commits since `25ba280`: the bell dispatches a local open event only for an unmodified primary click while already on `/notifications`; the inbox handles it through `read(0, null)`, which retains the existing probe, owner validation, visible-load snapshot, and acknowledgment path. Modified clicks retain the normal link behavior. Other changes format the same UI code. No new concrete defect identified. Browser same-route behavior and the final runtime build remain coordinator checks; I did not execute them.

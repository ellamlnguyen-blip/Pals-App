# TASK-028P2 consent runtime and owner UI review — 2026-10-06

Independent follow-up review of committed DATA test follow-up `096e51c` and owner UI commits `f4727cc` / `ef0d265` on `agent/TASK-028P2-rich-profiles`. The PHOTO candidate was uncommitted and outside this review. This receipt changes no application, test or database code.

## Disposition

**No blocking source or test-evidence finding in this bounded review.** The DATA handoff reports 55 pgtap assertions on the persisted disposable-local migration, genuine Auth HTTP default-off and positive/negative detail checks, and seven observed committed-order races. The reported final database state is rich gate false, rich preference rows zero and synthetic Auth users zero. I reviewed test source and the handoff for what those claims establish; I did not rerun the database tests.

The committed concurrency harness checks the exact named DB port, uses a synthetic UNC owner, makes both raced sessions commit, observes the second session waiting before releasing the first, and asserts the resulting People/rich preferences or pilot policy. It covers both People-off/rich-on orders, both pilot-close/rich-on orders, both People-off/pilot-management orders and authenticated direct profile-row-first UPDATE versus rich-on. The pilot branch calls the current `private.pilot_lock_management` helper and changes availability in the same transaction. The profile branch sets the first session to `authenticated`, so its UPDATE runs the existing profile-write trigger after taking the profile row. The wait/result evidence is appropriately scoped to this local lock graph; it does not prove every external Auth/status writer schedule.

The live HTTP harness uses two real local Auth sessions and PostgREST RPCs to prove a default-off response, positive opt-in/detail projection, anon/forged/self/raw denial, CAS stale/no-op behavior, rich-gate and Auth revocation, and opt-out when a gate or confirmed email is lost. It creates only synthetic users, captures/restores policy values and deletes those users. The original read-only probe separately confirms the existing Maya/Jordan default-off boundary.

The owner page fetches the separate consent revision and owner profile, previews current selected primary/extras, hometown and prompts, and explains future edits/replacements and the limit of revoking already delivered content. Rich opt-in needs explicit acknowledgment and a loaded preview. The server action binds to the verified cookie user, validates the CAS revision, sends no actor ID, and reads authoritative stored consent after the write or error. The rich control remains enabled for opt-out whenever stored consent is on, even if readiness, People/rich gates or preview availability fails. `pilot-pending` and verification/profile navigation provide a path back to the consent page under the relevant access states. The existing People-off action refreshes the server page; the rich control key includes stored state/revision, so an atomic backend clear replaces stale client state.

## Remaining evidence

- Rendered browser verification is pending for the owner preview, acknowledgment, CAS conflict/reload, People-off clearing, and opt-out through pilot-unavailable or lost eligibility states. The owner UI handoff does not claim this passed.
- This review gives no PHOTO resolver/gateway or peer UI clearance. Those have separate code/security and browser gates.
- No hosted migration, gate activation, reset, push, shared queue or app change was performed by this reviewer.

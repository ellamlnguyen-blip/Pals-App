# TASK-006 — Security and coordinator UI review

Date: 2026-09-22
Scope: Accepted ADR-0011 and TASK-006 owner profile enrichment/photos only.
Reviewers: fresh read-only security agent `task006_security_review`; coordinator independent rendered check.

## Security review outcome
No unresolved application security findings in the reviewed migration, owner actions, photo stream and validation. Existing active-owner profile draft and verified-owner Storage distinctions remain intact. App pages/actions/photo streams require live readiness. No peer/operator reader expansion, arbitrary supplied photo path, signed/public URL, privileged application key or hosted operation was introduced.

Whole-set photo assignment retains Storage object KEY SHARE locks until commit; deletion locks and inspects the current profile tuple. Conflicting lock orders may abort safely. Server-owned revision plus web compare-and-swap prevents stale editor writes. Static reasoning does not replace runtime concurrency evidence; see implementation handoff for executed tests.

Findings resolved:
- Database optional-field trimming initially used space-only btrim, accepting tabs/newlines through direct API writes. The final helper matches JavaScript trim whitespace; direct SQL/HTTP rejection tests cover this boundary.
- Photo save errors initially asserted references were unchanged even when a response might be lost after commit. Final copy reports an indeterminate result and requires reload; the test performs the real PATCH, discards its response and verifies the referenced image survives cleanup and retry.
- The HTTP suite temporarily changes shared campus activity, so parallel concurrency tests could fail spuriously. The runner now uses `--test-concurrency=1` (coordinator verified) to serialize those suites.

Coordinator final review additionally found upload-response loss could leave an unreported unreferenced object. The action now attempts protected deletion of its fresh upload path on an upload error and reports retryable cleanup uncertainty. Tests inject a real committed Storage POST followed by response loss, verify unchanged profile revision and restored object count, and exercise failed cleanup plus retry.

The fault-injection preload exists only in the local test runner's NODE_OPTIONS, additionally gated to local environment and the loopback Supabase URL. It is not imported by application code/builds. Coordinator checked the final ESM preload conversion and serialized runner. No security review database mutations were performed.

## Independent rendered verification
Coordinator used the actual local web sign-in with a disposable synthetic account, observed Signing in state, reached Hangouts, used avatar menu to open profile, and observed the private-profile loading screen. Desktop screenshot showed coherent existing Nunito/campus-blue styling, owner-only notice, readable required fields and read-only university/email.

At phone width 390, the profile stacked cleanly with visible identity/privacy text and loading state. At width 320, editable form document clientWidth and scrollWidth both measured 305 (remaining width is scrollbar), with no horizontal overflow and a clearly visible input focus ring. Tab after Edit entered the real-name field. A temporary unsaved name edit followed by Cancel restored the persisted name and disabled editing. No root test edit was saved. Browser error/warning logs were empty. Temporary viewport override was reset and root-created tabs closed.

Coordinator requested focus return to Edit details after cancel/successful save, because the disappearing bottom-of-form button left keyboard focus on the body. The final focus restoration is implemented; implementer verified browser activeElement was Edit details after Cancel. Implementer separately reports desktop/phone edit-error-recovery/save, keyboard cancel, and photo 0→4→0 management with completion status/focus for disappearing cards. See TASK-006 handoff for its final evidence.

## Limits
All runtime evidence is local and synthetic. Security reviewer performed static review, not an independent full runtime rerun. Coordinator rendered review was light mode; no independent dark-mode rendering or Lighthouse score was captured. The white one-pixel photo is test fixture data, not a shipped visual asset. TASK-003 hosted HTTPS callback/real UNC delivery, peer photo privacy/blocking and TASK-005 remain separate. Final integration/publication is coordinator-owned and recorded in TASK-006 handoff.

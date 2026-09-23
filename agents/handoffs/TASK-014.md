# TASK-014 local DM completion handoff

Date: 2026-09-23
Status: bounded disposable-local implementation complete; canonical publication receipt follows in shared state.

Accepted ADR-0016 was explicitly approved by the user after reviewed planning. Reviewed and published stage contracts preceded fresh GPT-6 Sol medium backend and UI agents. The backend tip `eb5259e521df86d17e8cc5d01c69e4ae8b90f57b` was integrated first; the final UI tip `2ef04df3585802738de7df55b1c5a3f284d6a2dd` was independently reviewed and then merged. See `TASK-014A.md`, `TASK-014A-REVIEW.md`, `TASK-014B.md` and `TASK-014B-REVIEW.md` for bounded evidence.

The local feature supports one consent-based first-message request from fresh People detail, recipient accept/reply/ignore, participant-only direct text chat and terminal/paused management. A separate default-disabled private DM gate, caller-bound RPCs, direct table denial, retry identity and transaction locks protect the backend. The web uses no-store responses, fresh original-account checks, bounded pages and masking/revalidation on account or visibility change. People block tears down the local DM pair as defined in ADR-0016 without changing Hangout access. No profile/photo reader is added.

Backend SQL actual-role, Auth/HTTP and deterministic revocation/race suites passed, including gate/account/photo/campus/preference changes and in-flight body read. Final UI workspace, signed-in HTTP and rendered desktop/phone/tablet/keyboard checks passed within the stage handoff limits. Reviews corrected privacy/liveness races before integration. Gates are false, fixtures zero and disposable services stopped. Hosted use, Realtime, notification delivery, global block/reporting, moderator access and production retention remain separate work under TASK-015/016/017 and launch gates.

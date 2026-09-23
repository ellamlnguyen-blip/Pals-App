# TASK-016B contract review

Date: 2026-09-23
Dependency: reviewed TASK-016A tip `2819d8f7e04dad24121fd891fa2c53e546344f90`, integrated on independently remote-verified main `d99adde65858080a0d5a6e966396b26be7e4fd1a`.

A fresh GPT-6 Sol medium agent drafted the bounded reporting contract; coordinator clarified replay/new-key lock branching before a separate fresh security reviewer examined it against ADR-0018 and actual helper definitions. Review clarified the explicit post-wait source-gate check and distinguished parent/gate row locks from the readiness helper, including its campus argument. The read helper also checks the source gate indirectly; no missing-gate defect in A was found. No new policy, reader authority, hosted operation or implementation is introduced by this contract.

The final contract preserves original-input fingerprints, replay without target resolution, current versus retained caller-specific evidence, atomic five-new-report limit, private no-reader storage and receipt-only results. Independent final review approved the corrected contract with no remaining actionable gaps. Canonical publication precedes fresh B implementation dispatch. Standard speed is the app preference; tool dispatch cannot configure or verify speed. Coordinator owns shared records, review and integration. Documentation consistency and `git diff --check` are the applicable checks here; runtime evidence belongs to B implementation.

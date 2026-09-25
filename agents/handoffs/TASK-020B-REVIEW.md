# TASK-020B exact-tip design/security review

Reviewed task tip: `65f0356c8cce888d769adcadcb41d050d78f40da` on `agent/TASK-020B-large-hangout-ui`, independently verified on the project remote.
Reviewer: fresh GPT-6 Sol medium agent, read-only and separate from implementer.
Result: clear; no remaining P0/P1/P2.

The first pass found two P1 implementation issues in the in-progress UI: the host-size call followed the final detail access check, and a nullable size state conflicted with the client prop. Both were fixed before the first committed tip. Exact-tip review then identified two narrow P2 contract discrepancies: the discovery cutoff was captured after an awaited access check, and a known stale joining revision shared the uncertain write state. The corrected tip captures the cutoff at action entry and returns a distinct stale result and reload message. Fresh review checked the final delta, source authority, private-content masking, two-read discovery comparison, joining revision proof and handoff, with no remaining finding.

The B handoff records passing typecheck, lint, 46 Node tests and production web build, authenticated local host/viewer and responsive/browser checks, and the clean reset. A lost network response and a gate flip in the narrow interval between B's two calls were not independently injected in this UI pass; the safe source path and Stage A's gate-epoch HTTP evidence were reviewed. No hosted operation or gate enablement was reviewed.

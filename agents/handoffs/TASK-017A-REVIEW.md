# TASK-017A exact-tip security review
Date: 2026-09-24
Reviewed task tip: `387a9c7b1b0eea1076aa20b51a1f5cc9bddf154b`
Status: Incomplete; no canonical code integration

## Findings

- **P1 — Versioned case action is unusable for a second operator.** The accepted ADR-0019 detail allowlist omits `case_revision`, while transitions require an expected revision. The draft correctly retains the accepted allowlist. Proposed ADR-0020 would add only the audited exact-ID detail revision; it is awaiting explicit user acceptance. Stage A cannot be accepted or integrated until this is resolved and tested.
- **P2 — Revocation overlap evidence is incomplete.** The task's concurrency suite observed role/account revocation committing before the operator action but not the operation holding authorization locks first. The implementer is adding those commit-order tests. After ADR-0020 acceptance, an existing-case second-operator read and stale-action test is also required.

## Corrected task tip

The implementer added role-operation-first and account-operation-first observed-wait tests on independently remote-verified task tip `b73eca2cb528f11b761a4de3fd5ef5e2201fbaf5`. Fresh exact-tip re-review found the P2 gap closed with no new blocker in that diff. The reviewer checked syntax/diff and the reported observed-wait assertions; it did not rerun stopped local services. The P1 ADR-0020 decision remains open, so Stage A is still incomplete and off main.

The fresh read-only reviewer found no additional confirmed privilege bypass in static source review. It did not rerun the stopped disposable services; the implementer's local test/cleanup evidence is in `agents/handoffs/TASK-017A.md` on the task branch. Any corrected tip requires re-review. No hosted use is authorized.

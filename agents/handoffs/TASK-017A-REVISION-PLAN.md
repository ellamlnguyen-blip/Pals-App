# TASK-017A case-revision amendment review
Date: 2026-09-24
Branch: `agent/TASK-017A-revision-amendment`
Baseline: remote-verified canonical main `0df34e9fb7318582cced4d980aaa386547e142c0`

## Finding and decision gate

The accepted ADR-0019 exact detail field allowlist omitted the case revision required by the Stage A compare-and-set transition API. A second authorized operator could not obtain the current revision for an existing case. Proposed ADR-0020 adds only `case_revision` to the already audited exact-ID operator detail, not the queue or student APIs. It remains Proposed until explicit user acceptance; the implementation agent has been told not to project it meanwhile.

The existing Hangout ownership trigger rejects `host_id` updates, so an ordinary host-change commit race cannot be tested. The Stage A contract now requires the immutable-host denial test instead.

## Independent review

A fresh read-only contract/security reviewer checked the exact ADR and contract diff against ADR-0019 and the schema. It found no blocking privacy or policy contradiction and approved publication as Proposed. This review is not ADR acceptance.

## Publication

Task and canonical-main remote SHA receipts: pending publication. No runtime code or hosted environment is changed by this planning record.

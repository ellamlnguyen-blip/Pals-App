# TASK-032 coordinator candidate handoff

Status: **reviewed disposable-local functional candidate; incomplete**. Application6c9278bd992bcf6ef6a96ad0017e01800a27c817 on `agent/TASK-032-interaction-photos`; dependency5677446 merged at e280837. Contract5985e6be/main e669d987 preceded implementation. Routine source publication and docs-only main publication do not constitute user sign-off or application integration.

## Delivered candidate

- Stable retained map pins, forgiving pin/card travel,8% selected enlargement, accessible close/reopen. Create chooses an approximate public map place first, then preserves details across Back/Continue through existing caller-bound submit.
- Existing profile design retained. Reusable pinned cropper handles in-place primary and rectangular optional photos; local preview, drag/zoom/reset/Cancel/Save, actual server normalization and owner Storage/CAS cleanup. Extras support0–4, View/Replace/Reposition/Delete, desktop drag and explicit touch/keyboard movement. Inline name editing reuses Account validation; trusted school/email remain readonly and invalid field saves retain drafts.
- Owner/header and existing authorized photo consumers invalidate without photo/identity payload. Existing permissions, consent, no-store routes and backend architecture unchanged; no migration.
- Standing backend/user-sign-off rule is in AGENTS on canonical maine738550. Applicable backend integration/persistence must be finalized with each signed-off change. Hosted actions still need that explicit sign-off and existing target/release gates.

## Review and execution

See [QA report](../../docs/ux/TASK-032-INTERACTION-PHOTO-QA.md), [source review](TASK-032-REVIEW.md), and StageM/P1/P2 handoffs. Final fresh source review is clear,93/93units(no skips), scoped lint, admin TypeScript, runtime webpack/web TypeScript pass. Actual fake owner primary/gallery/fields/Create mutations persisted; normal foreign owner denial and storage cleanup checks passed. Desktop drag restored order, normal fresh Auth verified revision18/four exact backup extras/preserved primary+text,5refs/5objects/no missing/orphans.319×720 primary modal fix and1280 desktop behavior are distinguished from physical device tests. Private runtime adapters and screenshot capture limits are explicit in QA.

## Remaining work

Physical mobile gestures/pickers, actual file drop and timed interruption/concurrency/source-availability acceptance remain open. Current cross-tab photo refresh in Calendar/saved previews still needs runtime acceptance; ordinary Auth sign-out clearing passed. User sign-off and TASK-027/028 staged student/peer/moderation/recovery acceptance gate hosted/app main integration. TASK-031 remains incomplete; this task does not finish its parent gates. Do not auto-dispatch a new product task from this candidate or documentation milestone. No unrelated checkout changes, hosted operation or production claim.

## Publication

Prior milestone task2c86ca8bb01774ab06e139090d9fafba86a2a1e8 and docs-only canonical maine7385507e70a05a6e409c6e9606045c3f9fe416f were independently remote verified. Final task candidate5e08bbaf71ffed54e6761aaba5d73e59d0a0610d, records branch1928148da80b04e2f9e0187e17a2f82499174d90 and reviewed documentation-only main integrationd931b11c48c3782e2ff5dc78ecf33645b30cfe29 are pushed and independently remote verified; see [publication receipt](TASK-032-PUBLICATION.md). No TASK-032 application code has been integrated into main.

# TASK-028P1 coordinator handoff

Status: authorized owner corrections reviewed and locally verified; **canonical application integration incomplete** behind parent TASK-027 staged acceptance. Parent TASK-028P full rich-peer disclosure remains awaiting explicit ADR-0036 choice and bounded implementation. No successor from this substage.

## Result and fixed sources

Branch `agent/TASK-028P1-profile-corrections` begins from freshly fetched, remote-verified canonical383b97c and reviewed parent3f7c5f6, mergedc32a7af with canonical shared docs retained. DATA1a33f91 implements Accepted ADR-0037; photoa81a0e7/focus4d75f8e and UI224e06f plus visual954b396 implement the requested owner behavior. Final app code `954b396c2b1d263d35c6744a6e407f5bf67da1d4`; independent final review `97884f56b13c88855904167c4299e4d542e92f67` is clear.

Each owner's optional hometown is self-declared trimmed100-Unicode text, nullable, owner-only with existing revision/CAS/access guards. The pin row uses their actual saved value, no inferred location or Raleigh default. All five saved images offer View photo / Edit photo. View uses the existing opaque private owner URL in an accessible modal; Edit opens/focuses that exact existing replacement input. Primary removal remains unavailable; extras retain existing add/replace/remove behavior. Data-driven components apply to each account, never only Maya.

## Evidence and review

DATA migration+pgTAP23/23 ran in one rollback transaction on verified `supabase_db_pals-task028-disposable`55422, preserving existing fixtures. After independent review, the exact migration20261006000100 was persisted only there with schema_migrations history; no reset/gate change/original-stack mutation. Owner/peer/anonymous/banned grants, optional access, Unicode bounds and stale CAS are covered. Root units6/6 without skips; focused type/lint/format/diff checks and final isolated production webpack build pass.

A dedicated fourth genuine local Auth/Mailpit account passed real server-action hometown save/trim, clear,100/101 Unicode, stale-preservation and anonymous-denial checks plus normal private photo add/replace/remove/cleanup. Fault-injection suites were not rerun or claimed. Browser224 verified all five View triggers, matching images, Close/Escape/backdrop/return focus, View→Close focus, Edit→photo-primary and extra4→photo-3, actual selected-file preview/replacement success/reload, hometown save/cancel/reload, and second account Jordan's distinct Durham/Biology2027 with honest empty photos/prompts. No Maya content appeared on Jordan. Peer route retains real Friends/Open chat and zero owner edit buttons; no rich disclosure was fabricated.

Final954 same-input original-resolution screenshot comparison passes the authorized layout, including corrected normal navy hometown26px/outline pin30px at793 and16px/22px phone.320/390/793/1280 have no horizontal overflow,1.31 gallery ratios and52px+ owner actions. Root design-qa.md and evidence/TASK-028P1 document exact screenshots/limits. Visual differences include owner actions, AA blues, font wrapping and fictional fixture composition. Independent source review does not claim independent browser coverage; root performed that coverage.

## User review runtime

`http://localhost:3030/profile` runs final954 in `/private/tmp/pals-task028-profile-corrections-runtime-final`, detached PID59005. Manifest verifies1022 committed files, three local-copy loopback origin/target adaptations and zero other mismatches. Environment/credentials remain0600; private test file `/private/tmp/pals-task028-runtime/PROFILE-CORRECTIONS-TEST-SIGN-IN.txt` contains Maya/Jordan credentials. Final page is left signed in as Maya. Previous3000/3029 servers and earlier user fixture/Hangouts remain. Existing local hosted-only readiness503 and absent Mapbox token remain limitations, not failures newly waived.

## Publication and remaining gates

Exact task branch and documentation-only main remote SHAs are recorded in TASK-028P1-PUBLICATION.md after verification. Main gets reviewed contract/status/evidence only; code/migration stays on the task branch until parent staging acceptance. No hosted migration, service credential, new peer projection, public/signed photo URL, privacy weakening, production/domain change or release claim.

Remaining user decision: ADR-0036 default-off opt-in rich peer policy; AGENTS.md requires “major ADRs need explicit acceptance.” Other students' rich hometown/photos/prompts are not enabled. If accepted, implement the separately reviewed bounded consent/detail/gateway contracts with security/race/HTTP tests. Parent staged student/moderation/recovery acceptance, canonical application integration and remote verification remain incomplete. The current corrections do not silently accept the Proposed policy.

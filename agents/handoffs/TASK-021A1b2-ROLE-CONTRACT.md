# TASK-021A1b2 role-lock contract amendment handoff

Date: 2026-09-27
Status: Draft documentation complete locally; fresh independent review/publication/repair pending. B2 and parents remain incomplete.
Branch: `agent/TASK-021A1b2-role-contract`
Canonical baseline inspected: `44a27a9dbef1255440530a26e8aa70d307f76383`; reconciled/rebased onto coordinator remote-verified `2195fe2a0ea554f48dbf72e54c43161894c0cc42` with its incomplete/blocker milestone preserved.
Implementation inspected: `3f169719e20033aaefbf0f975091ee4063dfc132` (unpublished; cleanup ongoing).

## Outcome

Amended only the B2 contract with a dependent S9 mini-stage for immediate missing-row denial in the three mandatory locked gate/account/role lookups in `private.moderation_actor`. Its inherited role DELETE/reINSERT gap can admit an unlocked replacement tuple; actor account SHARE permits replacement-role FK KEY SHARE and no trusted role-writer advisory protocol exists. Existing final lookup/value/role/action/conflict checks, ABI/ACL/search path and lock graph remain authoritative. Optional report target absence is explicitly excluded from mechanical denial repair. Added deterministic two-order evidence requirements, actual callers/retries, FK-aware account/gate cases, no-leak/atomicity/default-off cleanup and fresh-review/rerun gates.

## Source inspection and limits

Read AGENTS, assigned B2 contract, Accepted ADR-0027, relevant AUTHORIZATION/SECURITY_AND_SAFETY/DATA_MODEL passages, identity platform-role/account constraints and final MR/AE/HD functions. Source search in current implementation confirmed no later `moderation_actor` replacement. Five current RPC callers retain the existing shared prefix; Hangout enforcement/retry uniquely takes social before moderation and its parent UPDATE once. The inspected B2 handoff reports 912 pre-repair SQL assertions (including B1 owner 49 SQL assertions), two Node modules comprising source-safety real Auth/PostgREST HTTP and actual-role SQL concurrency, and a final expanded source-safety HTTP rerun; no owner HTTP rerun is claimed at this tip. The existing role-wait fixture covers DELETE with reinsertion only after denial, leaving replacement between missing lookup and fresh EXISTS untested; these are retained historical evidence, not independently rerun or evidence of repair correctness. No runtime command, code/migration/schema/app/ADR/shared queue change, hosted operation or push was performed. Standard speed is app-controlled; tool dispatch cannot verify it.

## Review/publication gates

Fresh independent contract review must precede coordinator publication on main and repair dispatch. Coordinator owns NOW/BACKLOG/CURRENT_STATE/CHANGELOG and remote SHA receipts. Repair needs a bounded fresh Sol-medium implementation agent, fresh security review, complete new-source rerun and cleanup receipt; no product successor is created by this amendment. This branch is an independent no-hardlinks clone with canonical GitHub origin; local draft commit is not a remote publication or task completion. Exact commit SHA is supplied out of band to avoid a self-referential hash. Stop after this contract.

## Coordinator review/publication receipt

Fresh independent reviewer cleared exact8395aa6b11e502a58dcd7f7049576b26e3639ad2 after correcting evidence attribution and existing DELETE fixture wording. Contract branch independently remote-verified at that SHA. This documentation-only canonical publication preserves incomplete B2 and authorizes only the reviewed bounded repair after remote verification; no partial code is integrated. Existing partial task branchba4344a3b9fb2b4cc6268833f57accf3718fcc64 independently remote-verified with cleanup receipt and unresolved P1.

Canonical reviewed contract/shared-record publication independently remote-verified6246a649949482cfa31ff4eacc4109c50c42b615; fresh bounded repair executor dispatched from this receipt, with source-review-before-runtime gate. B2 remains incomplete.

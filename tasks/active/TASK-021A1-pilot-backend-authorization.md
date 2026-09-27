# TASK-021A1 — Pilot backend authorization stage parent

Date: 2026-09-27
Status: **Draft allocation parent — not executable; three sequential contracts require review/publication**
Parent: [TASK-021A](TASK-021A-pilot-admission-capabilities.md), incomplete TASK-021.
Draft baseline: `ae7141f1f630fdb0eee2216ed1fe33dac6ee963e`.

## Goal and bounded split

Implement only the accepted private admission/capability database boundary using disposable synthetic database/API fixtures. The original A1 allocation is too broad for one implementation dispatch: it combines authority/audit schema, RLS/Storage/peer/source revocation, lock ordering and all deferred legacy RPCs. Split into these separately reviewed sequential units:

1. [TASK-021A1a](TASK-021A1a-admission-authority.md): private admission/policy/manager/audit primitives and controlled management. It does not switch existing student authorization.
2. [TASK-021A1b](TASK-021A1b-live-admission-enforcement.md): ordinary admission/onboarding/Storage/source/peer enforcement and exact retained safety/operator semantics, with concurrency evidence.
3. [TASK-021A1c](TASK-021A1c-deferred-capability-denial.md): deferred authoritative capabilities, safe required-field/primary-photo writes, legacy regression adaptation and complete backend closure.

Only A1a is the immediate implementation-contract review candidate; A1b/c are detailed dependency planning allocations until reconciled to their prior integration. Independent review, remote-verified accepted integration and handoff of each unit gate reconciliation/review/publication/dispatch of the next. Do not dispatch dependents concurrently or mechanically extend an oversized unit; propose another bounded contract first. A1a primitives alone do not enforce admission; A1b alone does not close every deferred capability. Final A1 integration gates drafting/reconciliation of A2, which owns application types/access states/callbacks/routes/actions/API photo delivery/UI and complete app fixtures. No A2 dispatch until A1c and parent backend acceptance pass. Neither A1 nor A2 alone is a release.

## Acceptance authority and expected incompatibility

The exact final ADR-0027 acceptance on 2026-09-27 is independently reviewed and durably published on verified main `ae7141f1f630fdb0eee2216ed1fe33dac6ee963e`. Verify this accepted unchanged design before implementation. All three contracts remain Draft until independently reviewed/published. Accepted ADR-0026 alone is insufficient.

A1 intentionally changes the DB status contract and denies previously ungated owner/deferred paths. Current app access-state unions, redirect logic, profile editor, extra-photo slots, Calendar queries, People-dependent Chats and old test fixtures may fail closed or fail regression after A1b/c. Do not patch apps or weaken checks to conceal incompatibility. Record exact failing app checks as A2 dependencies. Backend-only test modules must run without Next.js. A1 completion does not require claiming current app behavior passes; incompatible application suites cannot be counted as backend evidence. A2 owns app reconciliation and full app E2E before any deployable pilot claim.

## Source inventory and ownership

Executor must expand this seed inventory into a final source-to-check table of **final definitions**, exact signatures, grants/RLS/triggers, helper callers, test IDs and outcomes; inventory replacements across all 20 historical migrations, not just first definitions. All public executable functions/private auth helpers and direct table/Storage paths need an assigned check or justified unchanged classification.

| Surface / source migration suffix | Assigned stage and required authorization check |
| --- | --- |
| `identity_foundation`, `verified_onboarding`: universities/accounts/memberships/platform_roles/profiles grants and owner RLS; `account_is_active`, `has_verified_membership`, provisioning/sync | b: caller-neutral status only for denied students; owner drafts/reference access classified explicitly; verified retains exact UNC meaning, no JWT/metadata authority; server roles/membership remain nonwritable. |
| `get_access_state`, profile/photo RLS, `require_active_profile_write`, `require_active_photo_write`, `validate_profile_photos`, `protect_profile_photo_delete`, revision trigger | b: admitted incomplete onboarding without ready circularity; live admission/policy serialization; c: optional fields/extra reference denial while primary replacement/cleanup and retained fields/objects remain valid. |
| `hangout_foundation`, global blocks, disables, large safeguards, co-host final definitions: Hangout tables and REST embeds, `ready_campus`, independent `ready_subject_campus`, `can_read_hangout`, roster helper, `lock_hangout` | b: admitted caller AND admitted host source; revoked-peer omission/retained management exception; private detail isolation; readiness/block/sanction/cancel rules preserved. |
| create/edit/join/leave/cancel/joining/remove RPCs and request ledgers; `query_saved_hangouts` | b: live actor/host admission, retries and locks; c: original chronological order/safeguard off, no new signals; source lawful RLS remains. |
| co-host promote/demote/step-down/list and `list_hangout_roster_roles`, `effective_hangout_cohost` | b: preserve backend role powers/invariants, admission-aware new promotion; exact minimal retained assignment IDs survive revoked nonhost; A2 alone denies UI/action entry. |
| chat conversation/message/retry private tables, `chat_require`, `chat_authorized`, `chat_lock_evidence`, `send_hangout_message`, `read_hangout_messages` | b: current caller/source authorization; former-author body retained with ID null, blocked author body omitted before cursor/limit. |
| People gate/preferences/blocks, browse/detail/preference RPCs; friendship gate/pairs/retries/suppression and all transitions; DM gate/pairs/messages/retries/suppression and all transitions | c: capability denies every student reader/writer/cleanup legacy RPC; internal safety reconciliation remains; b: no caller/peer admission bypass via readiness or active-owner helpers. |
| notification gate/preferences/items, require-owner, list/preferences/mark-read, source triggers/emit/reconciliation | c: client inbox/preferences/read writes denied despite legacy gates; retain internal hooks/evidence/dependencies, no client recovery via inbox. |
| attendance gate/answers, own get/list/answer RPCs | c: independent attendance denial, including retained/nonready access; no inheritance from Hangouts. |
| safety gate/provenance/blocks/reports/retries: retained IDs/state, outbound block IDs/unblock, `set_safety_block`, `submit_safety_report`, safety evidence/source helpers | b: exact active-account evidence recovery survives admission/shutdown; no-evidence denied; no source/name/photo/location/message reader; retain global reconciliation and existing blocks independently of deferred gates. |
| moderation gate/cases/audit/requests/sanctions/disables and report-list/detail/transition/apply-account/apply-Hangout RPCs, `moderation_actor` | b: independent active operator role/gate/conflict/audit authority during shutdown/unadmitted; manager authority confers none. |
| new private roster/policy/managers/audits/retry ledgers/helpers/management RPCs | a: caller-derived live manager; no student roster/oracle/DML; attributable immutable atomic audit; expected revisions, fingerprint retries, missing-row/manager/policy races. |
| Calendar raw Hangout source queries; external analytics app transport; owner slot/gallery streaming/signing | c documents DB capability contract; A2 performs purpose-specific app gate/delivery checks. Same lawful Hangout SELECT cannot be distinguished by Calendar intent; same owned private object cannot be classified by intended gallery use. Do not deny necessary primary lifecycle or claim DB suppresses already delivered/raw authorized bytes. |

## Backend parent acceptance

- [ ] Every surface above and discovered consumer classified and tested; no private roster/student existence oracle or new peer/photo/operator source reader.
- [ ] A1a management/default/audit matrix, A1b admission/retained-subject/onboarding/safety/operator/race matrix and A1c capability/required-field/primary/regression matrix all pass after final combined migration reset.
- [ ] Absent/revoked admission and missing/off policy deny ordinary access; shutdown/re-enable, old sessions, email/account replacement, independent restrictions and exact retries obey live state. No nonpilot bypass.
- [ ] Complete backend actual-role, local Auth/PostgREST/Storage and observed-lock tests pass; fixtures clean/defaults off; documented snapshot/bearer limits preserved.
- [ ] Independent security review closed; specs/handoffs/shared records and task/main remote SHAs recorded; app incompatibility and A2 requirements explicit.

Scope exclusions, environment discipline and completion procedure in each child apply to this parent. This is a drafting artifact, with no implementation/runtime/hosted evidence and no task completion or successor trigger.

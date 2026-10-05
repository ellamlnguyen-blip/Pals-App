# TASK-027S — Legacy owner HTTP access expectation

Date: 2026-10-05  
Branch: `agent/TASK-027S-owner-http`  
Base: `0c1bc49`  
Status: implementation and focused local verification complete; fresh review and coordinator integration pending.

## Outcome

The owner HTTP fixture now expects `ready` for a confirmed, active UNC owner before profile completion or photo upload, as accepted in ADR-0030. Its manager-positive policy and admission calls use a genuine local Auth TOTP AAL2 session under ADR-0034. The obsolete roster-admission loss race is replaced with account suspension, which still proves final Storage writes reject a committed eligibility loss. The legacy admission revocation check now verifies that the owner remains eligible under ADR-0028 while profile reads, authenticated photo access, signing and upload continue. The later availability and changed-email denials remain in place; a fresh confirmed UNC UUID is eligible without inheriting an admission row. No app, RLS, migration or manager implementation changed.

## Verification

- `node --check` and `git diff --check` passed.
- Focused genuine Auth/PostgREST/Storage suite: **1/1 pass, 0 fail, 0 skip**. Its six final-write waits rejected account suspension, availability shutdown and current-email loss for both INSERT and DELETE; duplicate upload, raw insert conflict, signed URL expiry and roster-independent owner access also passed.
- The first run exposed a disposable local provider mismatch: Storage 1.77.5 expected `name COLLATE "C"` in its partial unique index while the running database had the older index. Following TASK-027E, this checkout received only the ignored nonsecret `supabase/.temp/storage-version` pin; official local reset and preserved stop/start installed the matching provider index. No provider schema patch was made.
- After the passing run, an official local reset completed. Readback showed zero Auth users, admission rows, management audit rows and profile-photo objects; availability and every capability were off. The actual running Storage image was `public.ecr.aws/supabase/storage-api:v1.77.5`, and its index retained `name COLLATE "C"`.

## Handoff

The exclusive disposable stack was released to TASK-027Q after clean readback. This verifies only the focused local owner flow; staging Storage and whole-app release remain separate TASK-027 gates. Each fresh checkout must carry the matching ignored Storage version metadata before local resets. Fresh review and integration are coordinator-owned.

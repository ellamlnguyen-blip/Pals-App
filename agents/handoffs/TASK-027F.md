# TASK-027F — Attendance lifecycle test fixture

Date: 2026-10-05

Branch: `agent/TASK-027F-attendance-lifecycle`

Status: Local verification passed; independent review and coordinator integration pending.

## Outcome

The pre-fix run on a clean disposable database passed the attendance gate, source gate, and sanction races, then failed at the first real `leave_hangout` call with SQLSTATE `42501`. The rejection came from `private.pilot_lock_ordinary_lifecycle` before the leave transition: current source policy requires enabled pilot availability and the `hangouts` capability, while this older fixture enabled only legacy gates. The patch enables those two private policy switches in fixture setup and disables both in cleanup. It changes no production source, schema, race order, lock-wait observation, or denial assertion. The other twelve capability rows remain default-off while the fixture runs.

## Local evidence

- The shared Storage container used `public.ecr.aws/supabase/storage-api:v1.77.5`; this checkout's ignored, nonsecret `supabase/.temp/storage-version` was aligned to `v1.77.5` before official resets. A clean reset applied all 29 migrations. A second clean reset removed immutable evidence from the deliberate pre-fix failure before final verification.
- Full attendance concurrency passed: nine cases in both commit orders (18 races), both post-opening schedule edit orders, and the parent-lock case that begins before opening and fails after opening. The original waiting and SQLSTATE assertions remained in place.
- Attendance HTTP passed real local PostgREST owner/foreign/gate/projection/raw-table/embed and isolation checks after the concurrency run. Its first invocation stopped before fixture setup because `supabase` was absent from `PATH`; the successful run supplied the already installed CLI through `PALS_SUPABASE_CLI`.
- Post-suite readback showed pilot availability, `hangouts` capability, all capability rows, Hangout gate, attendance gate, and moderation gate disabled. `git diff --check` passed.

## Limits and handoff

The HTTP suite signs local fixture JWTs from the disposable stack secret; it does not establish genuine Auth/session behavior. Concurrency uses actual authenticated SQL roles and two database sessions to observe lock waits, but fixture Auth rows are inserted locally. Immutable moderation and attendance evidence remains after this suite; reset the disposable database before reusing fixed fixture identities. No hosted operation or policy activation occurred. TASK-027 remains incomplete pending independent review, accepted hosted operator controls, and staging smoke. The coordinator owns `NOW`, `CURRENT_STATE`, `CHANGELOG`, main integration, and remote-SHA receipt.

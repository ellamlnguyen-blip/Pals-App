# TASK-027 authorization migration review

Date: 2026-09-30
Scope: `20260930000100_open_verified_unc_mvp.sql`

## Exact change

The migration replaces seven existing functions without changing signatures, owners, client grants, trigger bindings, or policy definitions. `pilot_owner_subject_eligible` and `ready_subject_campus` stop joining the private admission roster. `get_access_state` stops treating a missing roster entry as `pilot_unavailable`; the availability switch still controls that state. The owner, ordinary Hangout lifecycle, and co-host/chat lock helpers stop locking roster rows. The private historical `pilot_caller_is_admitted` helper now derives the same live verified-UNC onboarding evidence and does not confer a separate grant.

The admission management tables and RPCs stay private for historical/audit purposes. The migration does not alter `has_verified_membership`, Auth provisioning/sync, source or safety policies, RLS, account sanctions, block/report enforcement, moderation, analytics capture, or the large-Hangout gate. All availability, capability, and legacy source gates retain their existing disabled defaults.

## Live evidence and lock order

`pals_provision_account` remains the first Auth insert trigger; `pals_sync_confirmed_membership` remains the second. Auth email/confirmation changes still update or remove membership evidence through that trigger. Eligibility requires an active account, confirmed Auth email, current verified membership with matching verification email, active UNC Chapel Hill campus, and a domain in that campus's exact allowed list. Ready status additionally requires a complete profile and owned primary private photo.

The owner writer keeps the shared pilot evidence lock, availability and onboarding capability row locks, then account → Auth → membership → campus row locks and a fresh post-wait eligibility check. Profile and Storage writes still use their existing trigger guards; the Storage service-role finalization guard remains unchanged. The social/Hangout writers keep social → shared pilot evidence → availability/capability → source parent and source gate → sorted accounts → sorted Auth → sorted membership → sorted campuses → sorted profiles → sorted Storage rows → lower participant/co-host state locks. Fresh post-wait subject, binding, source, and action guards remain intact. No advisory or row lock replaces a removed roster lock for another authorization predicate; the roster is no longer an authorization predicate.

Management writes still acquire the exclusive pilot evidence key after the shared social key. A concurrent availability/capability change therefore serializes with these writers. A concurrent account/Auth/membership/campus/profile/Storage change still conflicts with the retained tuple locks or causes a safe transaction abort. Fresh guards deny changed evidence after waits. Deadlock and serialization errors remain failures; no exception handler converts them to success.

## Verification and release boundary

The focused pgTAP test checks no-roster owner photo/profile completion, `ready`, direct owner RLS, roster-free Hangout creation, and denial of unconfirmed, non-UNC, suspended, banned, and email-revoked accounts. Run the migration reset, direct RLS suite, and lifecycle/race suites against a disposable database before relying on this review. Applying the migration does not activate hosted access; a target-specific availability/capability/source-gate action remains separately confirmed under TASK-027.

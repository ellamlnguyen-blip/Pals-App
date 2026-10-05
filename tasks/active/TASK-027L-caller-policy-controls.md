# TASK-027L — Caller-session launch policy controls

Status: Ready after reviewed TASK-027N manager MFA guard
Parent: TASK-027
Date: 2026-10-05

Add a narrow operator-only policy form/API in `apps/admin` for Ella's genuine signed-in publishable-key caller session to invoke the existing audited `set_pilot_policy` RPC. Use exact HTTPS Origin, secure cookies, no-store responses, role/account/current MFA preflight and the database's final manager/live MFA guard. Do not create a service-role proxy, direct SQL substitute, generic table editor, or automatic feature enablement. Keep analytics and large-Hangout safeguards unavailable.

The form must require an allowed capability key or availability, desired boolean, expected current revision, fresh request UUID and bounded reason, with an explicit confirmation of the exact target. Show the returned revision/receipt and preserve exact-payload same-request retry on uncertain responses; source of current revision is a separately reviewed read-only staging preflight. Availability is enabled last and disabled first under ADR-0029. Denied/revoked/expired sessions clear private form state. Do not silently create new manager authority.

Focused tests cover invalid key/Origin/cookie/MFA/role, stale revision, same UUID retry and denied response clearing. Run a genuine disposable local Auth AAL2 manager policy transition and rollback, plus rendered desktop/mobile forms. Fresh security review and handoff precede parent staging integration. No hosted gate change in this task.

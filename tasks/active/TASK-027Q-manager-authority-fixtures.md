# TASK-027Q — Reconcile legacy manager authority fixtures with MFA

Status: Ready after reviewed TASK-027N local integration
Parent: TASK-027
Date: 2026-10-05

From reviewed TASK-027N source, reconcile only `private_pilot_admission_authority.test.sql` and its existing genuine-Auth HTTP authority fixture with the new manager MFA guard. Preserve SQL default-state, grants/RLS, trusted-bootstrap original-role and AAL1/no-manager denial checks. Move manager-positive CAS, retry, audit, privacy and revocation assertions into the Auth-backed HTTP fixture using real local sign-in, TOTP enrollment/challenge/verification and returned AAL2 token. Include exact/changed/cross-operation request UUID, stale/no-op revision, invalid input/target, verification loss/reactivation, second-actor request scoping, manager revocation and missing singleton/capability coverage. Use trusted local SQL only for setup/readback, labeled as such. No fabricated positive JWT, Auth factor/session SQL insert, service-key caller or guard relaxation.

Preserve the old proof that a manager's AAL2 policy action still works after their own email becomes non-UNC, matching the user's rejection of per-action eligibility checks. Prove a genuine AAL2 non-manager admin/ordinary caller is denied so the denial is distinct from MFA. After genuine AAL2 second-actor activity, retain trusted readbacks for actor deletion cascading a live manager while keeping historical receipt, and target deletion cascading admission.

Run the full database suite and focused authority HTTP suite from clean disposable reset, preserve counts and denial/audit assertions, return local gates and fixtures to closed/empty, obtain fresh security review and write handoff. Do not modify unrelated owner expectation or manager concurrency fixture. No hosted writes.

# Testing Strategy
Automate critical behavior; do not optimize for arbitrary coverage percentages.

Required areas: authentication, visibility/RLS, exact-location privacy, block separation, host/co-host/admin permissions, hangout create/join/leave/open/close/edit/cancel, eligibility, friendship transitions, message requests, reports, suspension.

Core E2E: signup→verify→onboard; map→pin→join; create→another joins; group chat; people→DM request→reply; friend request→accept; block; report; host removal; attendance confirmation.

## Foundation checks

`pnpm db:verify` runs two local clean resets with pgTAP after each and lints both `public` and `private` schemas, failing on warnings. SQL tests use real database roles and synthetic JWT subjects in a rolled-back transaction. This is distinct from Auth API/session integration and hosted staging verification. CI declares a separate local database job; a local pass is not proof of a hosted CI run. See `supabase/tests/README.md` for the fixture matrix.

TASK-003 adds `pnpm test:auth:web` after SQL verification in database CI. It starts a local Next server with only local public configuration, then uses real Auth API, Mailpit confirmation links, the actual web PKCE callback/cookies, Storage API ownership and RLS, profile completion, escalation denial, page/photo gates and suspension. For an already-running web app, use `WEB_TEST_ORIGIN=http://127.0.0.1:3000 pnpm test:auth`. Plain `pnpm test:auth` omits web checks. The suite rejects non-local targets and uses disposable synthetic accounts. Hosted SMTP and HTTPS callback checks require separate deployment evidence.

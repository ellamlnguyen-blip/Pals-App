# Testing Strategy
Automate critical behavior; do not optimize for arbitrary coverage percentages.

Required areas: authentication, visibility/RLS, exact-location privacy, block separation, host/co-host/admin permissions, hangout create/join/leave/open/close/edit/cancel, eligibility, friendship transitions, message requests, reports, suspension.

Core E2E: signup→verify→onboard; map→pin→join; create→another joins; group chat; people→DM request→reply; friend request→accept; block; report; host removal; attendance confirmation.

## Foundation checks

`pnpm db:verify` runs two local clean resets with pgTAP after each and lints both `public` and `private` schemas, failing on warnings. SQL tests use real database roles and synthetic JWT subjects in a rolled-back transaction. This is distinct from Auth API/session integration and hosted staging verification. CI declares a separate local database job; a local pass is not proof of a hosted CI run. See `supabase/tests/README.md` for the fixture matrix.

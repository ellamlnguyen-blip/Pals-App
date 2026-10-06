# TASK-027I — Hosted moderation sign-in and MFA UI

Status: Local implementation verified; independent review completed; parent integration and hosted checks pending
Parent: TASK-027
Date: 2026-10-05

Implement accepted ADR-0031's bounded apps/admin HTTPS/session/MFA portion. Read AGENTS, ADR31, deployment/auth/security docs, existing admin flows/tests and relevant UX. Apply Leon's Taste frontend skill before substantial UI work; inspect usepals.com and existing tokens, plan interaction/visual treatment, retaining current admin patterns. Start fresh canonical main plus reviewed parent360d8e8. No web/student redesign.

Extend validated admin config from local-only to exact HTTPS staging origin and approved Supabase target. Use genuine publishable-key caller sessions, secure cookies, exact Origin checks, no-store private responses and no privileged report data until current AAL2 and live database role checks. Add Supabase authenticator enrollment/challenge/verify and recovery-oriented session revalidation, with no service-role proxy or recovery bypass. Ella owns personal authenticator secret enrollment/custody; agent must hand off hosted enrollment. Require MFA for privileged operator sessions only; normal students and ordinary app operations remain automatic. Don't require a fresh TOTP challenge for every RPC when a valid MFA session exists.

Prepare only admin UI/session/config files and focused tests; H owns shared local DB, no resets/mutations until its release. Coordinate actual integration with H's five-RPC guard and revocation semantics. Verify rendered desktop/mobile loading/error/enrollment/challenge/authenticated states and exact Origin/cookie/HTTPS behavior, then genuine local MFA flow after exclusive-stack coordination. Do not claim synthetic rendering is live Auth proof. No hosted project/deployment/account/role action, ordinary source behavior change or shared queue edit. Write handoff, commit/push and remote-verify, then stop for fresh review.

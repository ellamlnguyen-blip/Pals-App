# TASK-027 next steps to launch

Updated: 2026-10-02

This runbook follows the locally verified open verified-UNC MVP work. A completed local test run does not mean the hosted preview or public launch is ready. Keep broad student access closed until the target-specific checks below pass.

## Verified locally

- After the composite output repair, `pnpm db:verify` passed twice. Each invocation completed two clean resets, two pgTAP runs of 1,735 assertions, and warning-level schema lint with zero diagnostics.
- Local Auth/Storage, Hangout, co-host, chat, block/report/moderation-disable, attendance HTTP, and lifecycle/concurrency suites passed.
- Lint, typecheck, production build, and unit tests passed (48 passed, one sandbox-only skip).
- A final local reset confirmed zero Auth test users and all availability, capability, large-Hangout, and legacy source gates off.
- External analytics capture remains off. Large-Hangout safeguards remain off.
- After merging the latest canonical `origin/main`, `pnpm test:auth:web` initially exposed stale test setup/transport assumptions. The local fixtures now enable only their required pilot capabilities and restore all gates off; the tests use the current Next dev action manifest. The suite now passes all 4 suites. The active Safety API block/report transport separately passes in production mode against disposable local Supabase.
- `pnpm check` passed on the merged branch: formatting, lint, typecheck, 48 unit tests passed with 1 sandbox-only skip, and web/admin production builds.
- Local integration repairs are not hosted release evidence. Retired pilot-specific HTTP/race matrices with historical schema assumptions remain a separate coverage gap.

## Hosted preview sequence

1. **Reconcile and review the release commit.** Fetch current `origin/main`, resolve any intervening changes, review TASK-027's exact migration and app diff, and record the immutable source SHA. The agent last verified pushed SHA `3b1f448dc0e5868f2d4c396d0ac38e217074aaae`; coordinator commit `87c6f4a` adds the schema-lint repair and launch records but still needs remote verification/push.
2. **Select the exact nonproduction targets.** Confirm the Pals Vercel team/project, Supabase project reference, and preview HTTPS origin. Record them before any hosted write. Do not use a similarly named or unrelated project.
3. **Configure the preview.** Set only the reviewed preview environment variables. Configure Supabase's exact HTTPS site URL and `/auth/callback` redirect. Keep confirmation enabled. Configure approved SMTP and a controlled UNC test mailbox. Verify public Mapbox configuration and never expose service-role credentials.
4. **Deploy an immutable Vercel preview.** Deploy the reviewed commit to the verified Pals project. Check `/api/health`: require HTTP 200, `status: "ok"`, and all checks true. Stop on a target mismatch, HTTP 503, or any false check.
5. **Apply and inspect the database migration.** Against the explicitly selected nonproduction Supabase project, review the migration dry run, apply the complete expected migration chain, and inspect migration history, RLS/policies, grants, and gate values. Do not write to production during this preview step.
6. **Enable the included MVP gates on that verified preview target.** Turn on Hangouts/discovery, Calendar, People/friendship, chat, DMs, in-app notifications, attendance, profile enrichment, and extra photos. Leave consent-controlled analytics opt-in and external capture off. Leave the large-Hangout safeguards off. Record the exact gate state and rollback operation.
7. **Run positive and denial checks in the deployed app.** Verify confirmation email, callback, onboarding, sign-in/out, then test a complete verified UNC account. Verify denials for unconfirmed, unverified, non-UNC, incomplete, suspended, and banned accounts. Exercise Hangout create/discover/join, Calendar, People/friendship, chat, DM request/accept, notifications, attendance, blocking, and reporting. Confirm block/report and moderation effects after refresh and through direct data/API paths where the existing suites support them.
8. **Close moderator operations.** Assign a named primary moderator and a distinct backup; Ella cannot cover both roles. Verify least-privilege access, MFA/recovery, audit visibility, response/retention handling, and an incident contact before student invitations.
9. **Clean up controlled test data.** Remove tagged test users and source records under the approved retention plan, preserve required audit/evidence records, and verify the preview feature gates remain in their intended state.

## Public launch and `usepals.com` cutover

1. Present the verified preview SHA, health response, migration receipt, positive/negative smoke evidence, exact feature-gate state, moderator roster, rollback plan, and current DNS inventory for action-time release review.
2. Confirm production Supabase and Vercel targets independently. Recheck the production migration plan, Auth callback/site settings, SMTP delivery, backups/recovery, and final gate values. Keep external analytics capture and large-Hangout safeguards off.
3. Promote the exact verified build and run its health and core auth/safety smoke checks before moving the domain.
4. Inventory the current `usepals.com` DNS and hosting records. Attach the domain to the verified Pals Vercel project, update only the required records, then verify TLS, canonical redirects, health, and the production Auth callback.
5. Monitor errors, email confirmation, reports, Hangout creation/joining, and attendance. Use the recorded rollback plan if health, auth, access denial, privacy, or moderation checks regress.

## Current release blockers

- Vercel target is confirmed as team `pals8`, project `pals-app`. The production deployment remains on `main` commit `c1bc45b` at `pals-app-eta.vercel.app`. The existing TASK-027 preview health endpoint currently returns `{"status":"not_ready","checks":{"hostedEnvironment":false,"supabaseTarget":false,"publishableKeyPresent":false,"appOrigin":false,"mapboxPublicTokenPresent":false,"authConfiguration":false}}`. Vercel settings show the required variables are configured for Production only; Preview has none. Do not copy production Supabase values into a preview.
- The signed-in Supabase `Pals App` organization has one project, `plqhsyhdfgqygauntsts`, on its `main PRODUCTION` branch; no separate staging project/branch is available. No preview migration or access-gate change has been made.
- Retired pilot HTTP matrices still pin earlier migration history and assert roster-revocation denial. They were not rerun against the roster-free migration. Port the relevant source, safety, lifecycle, and race scenarios to a guarded disposable target before treating them as current release evidence.
- Supabase SMTP is configured to use `smtp.resend.com` with sender `no-reply@auth.usepals.com`, but delivery to `ella_nguyen@unc.edu` has not been tested. Run the controlled confirmation test only on a nonproduction project with its exact HTTPS callback configured.
- The proposed backup address `ella_nguyen@kenan-flagler.unc.edu` appears to be Ella's address too; confirm a different person's identity and grant only the separately approved least-privilege moderator role.
- The coordinator's latest TASK-027 commit is local-only. GitHub resolution/push must be retried, then the task branch and current canonical `main` refs verified before integration.
- No production deployment or `usepals.com` DNS change has been made.

Do not invite all UNC students until these blockers are closed and the deployed positive/negative smoke sequence passes on the exact target.

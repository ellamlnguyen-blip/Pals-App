# Handoff — TASK-003
Date: 2026-09-22
Agent: fresh TASK-003 implementation agent; independent security/design reviewers coordinated by parent
Branch/worktree: `agent/TASK-003-auth`, `/Users/ellanguyen/.codex/worktrees/4445/Pals App`

## Outcome
Implemented the bounded auth and required-profile onboarding flow under Accepted ADR-0009. Full local verification passes, including repeat-reset, the exact CI helper and rendered authenticated onboarding. Deployed HTTPS staging callback and hosted SMTP remain explicit incomplete acceptance work. No TASK-004 work started.

Coordinator reviewed this handoff, the independent reviews, scoped diff and verification evidence on 2026-09-22. Local implementation is accepted; hosted callback/email acceptance remains open. GitHub publication and new CI execution are not yet verified.

Final coordinator outcome: app/docs committed at `daebb67` after migration commit `827159d`. Push to `origin agent/TASK-003-auth` failed because the configured Keychain credential was unavailable (`failed to get: -128`); no remote publication is claimed. User must authenticate locally with their replacement credential. Next, Supabase and the temporary Lima VM are stopped. No TASK-004 dispatch occurred.

## Files Changed
- Web routes/actions/forms, server-only Supabase SSR client, cookie refresh proxy, live access gate, authenticated photo stream and shared form tokens.
- Shared UNC email/profile/photo validation, pinned Supabase dependencies, dual x64/arm64 dependency support.
- Migration `20260922000100_verified_onboarding.sql`, private Storage policies, confirmation-derived membership and caller-bound access RPC.
- Expanded SQL matrix, real HTTP Auth/Storage/web tests and CI helper; corrected reset/test network flags.
- Setup/auth/authorization/data-model/testing/deployment notes, current state, task queue and changelog.

## Behavior / Architecture Impact
Signup and resend send PKCE confirmation to the exact configured origin's `/auth/callback`; callback validates the browser verifier, exchanges the one-time code and always goes to `/continue`. No external `next` destination is accepted. Server-side user verification and live database access state gate onboarding, readiness and photo requests. Sessions are HttpOnly, SameSite=Lax, Secure on hosted HTTPS, and uncached. No application service-role key is accepted.

Database confirmation synchronizes campus membership only from current confirmed Auth email and the exact accepted UNC allowlist. Current email, allowlist, campus and account status are rechecked live. Client metadata cannot grant campus access, verification, roles or reinstatement. “UNC email verified” intentionally does not claim current enrollment.

Required profile fields and an existing owned private photo gate entry. Private photo readers are the active verified owner only; no peer/moderator blanket access. Uploads have random immutable paths beneath the owner UUID, 5 MB limit and JPEG/PNG/WebP restrictions. Missing/foreign references and deletion of the current primary photo are denied. The app streams photos through an authenticated no-store route and emits no bearer signed URL. Raw Storage signed URLs still have their ordinary expiry behavior if deliberately created by an owner. Image metadata is preserved; EXIF normalization is not implemented.

## Tests / Verification
- `pnpm check`: PASS (format, zero-warning lint, all strict package/app typechecks, eight Node tests, both production builds). Rosetta performance notice remains; CPU packages now support both arm64/x64.
- `pnpm db:verify`: PASS, two clean migration/reset cycles with 75 actual pgTAP assertions each, then public/private schema lint without warnings.
- `pnpm test:auth:web`: PASS after repeated resets. This is the same local-server startup/helper invocation now used in database CI. It writes/prints no credential file, enables all web checks and stops its server on completion. This local pass is not a hosted CI execution claim.
- Real local HTTP suite with `WEB_TEST_ORIGIN=http://127.0.0.1:3000`: PASS. Covers mail-catcher confirmation, actual callback HttpOnly cookies, incomplete/anonymous/complete/suspended web gates, invalid callback/open-redirect denial, actual Storage ownership, cross-user read/overwrite/delete, foreign photo assignment, primary deletion, role/status escalation denial and stale-session suspension. Synthetic accounts cleaned.
- Initial HTTP run found a development-runtime defect: CLI reset recreated Postgres on a different network. Parent repaired runtime; repository reset/test scripts now retain `pals-local-network`. The app/SQL policies were not weakened.
- Initial web-gate assertion expected an HTTP Location header; Next's loading boundary streams redirect metadata with status 200. Tests now assert the actual streamed redirect and absence of protected page content.
- Independent static security review: no actionable findings; actual execution evidence is distinct from the review.
- Desktop/tablet/phone anonymous signup/signin/confirmation screens inspected by fresh design reviewer, including 320px phone and 768px tablet. Visible focus, responsive content, error recovery and AA contrast passed. Review found lost email/profile text after errors; safe values are now returned/preserved without passwords/files. Signin retention retest passed.
- Parent committed migration `827159d` and applied only TASK-003 to authorized hosted development/staging project `plqhsyhdfgqygauntsts`, with no seed and zero Auth users. Both versions match, public/private schema lint passes, exact five domains/private 5 MB JPG-PNG-WebP bucket/three owner policies/authenticated-only gate grants verified. Hosted Auth health/settings read-only checks passed. These catalog checks are not hosted email or HTTPS callback E2E evidence. See `docs/operations/HOSTED_ENVIRONMENT.md`.
- Implementer rendered check after the user's explicit disposable-test login approval: successful real signin → onboarding at 1280px desktop and 390px phone (document/client/scroll width all 390, no horizontal overflow) → filled required profile and uploaded a local synthetic PNG → actual server action reached `/hangouts` readiness, inspected at 768px tablet → signout returned `/signin`. Pending “Signing in…” and “Saving your profile…” states observed. No clipping or interaction defect found. The one-pixel white fixture photo is test data, not a shipped visual asset.
- Independent reviewer inspected anonymous forms only; their browser disconnected before authenticated review. Authenticated visual evidence above is implementation-agent evidence, not misrepresented as independent. Dark theme tokens and contrast were checked statically; no authenticated dark-mode screenshot or Lighthouse measurement was captured.

## Design Decisions
Read Leon Taste in full, Next.js and React guidance, relevant specs, tokens and live usepals.com. Preserved friendly campus blue, white canvas, Nunito, rounded panels and casual copy. Product forms use native CSS; landing-only image/motion prescriptions do not apply. Variance 3, motion 2, density 4. Two-column intro/form collapses to one column below 768px. Loading, inline errors, disabled pending actions and link-expiry recovery exist. Broad feature navigation is not faked before those features exist.

## Known Limitations / Remaining Acceptance
No deployed frontend origin exists, so actual hosted HTTPS confirmation callbacks remain unverified. Hosted SMTP must support real UNC recipients; default provider limitations prevent claiming public email onboarding launch-ready. Password recovery, optional profile enrichment/editing, peer photo visibility, moderation UI and Hangout/social/messaging flows are outside this task. No domain/DNS cutover.

## Ready for Next Task?
Not an automatic dispatch. Orchestrator must preserve the explicit staging callback/email delivery acceptance gap. Implementation agent stops after this bounded handoff. Final Git commit/push and hosted updates are owned by the parent; migration was already committed/applied separately. Local Next and Supabase services are stopped after verification; the temporary Lima VM can be stopped by the parent using the TASK-002 runtime instructions. The disposable `task003-visual@live.unc.edu` account/photo remains only in the stopped local backup after visual verification; the next `pnpm db:reset` removes it. No real user data was used.

# TASK-028R — Hosted test release of accepted profiles

Status: Hosted owner test available; full feature/multiuser staging acceptance remains incomplete.
Date: 2026-10-12 (America/New_York).
Parent: TASK-028 / TASK-028P; release dependency TASK-027 stays incomplete.
Baseline: remote-verified canonical main `3cef3d6519833d3c18bf9a3ad4dc4d59fbeb73b7`.
Reviewed source: `agent/TASK-028P2-rich-profiles` tip `20cdd69cc45398334dbd37aeaee29bd980d1a514`, reviewed application `e27db7a3808a266d452878581e9d0c5a73f9b4cf`.

## User authorization and boundary

User requests “lets make the hosted release available” and explicitly selected “Hosted test release (recommended).” Prepare and deliver the accepted profile/MVP experience on the existing Pals nonproduction backend `ffabdrgsmtfylrehwmfo` and Vercel `pals8/pals-app` Preview. No public usepals.com launch, production database, domain/DNS, new operator authority, fake UNC identity or disabling confirmation/RLS/protection. Existing explicit rich consent remains required; never opt existing content in automatically. Preserve dirty shared checkout. This is a continuation substage, not a new successor chat or parent completion.

## Bounded preparation and execution

1. Verify exact remote source, existing deployment commit/environment and staging target/history/policy. The Vercel signed-in dashboard shows Ready deployment `dpl_6nK7ngvNHKPZmJVqUnk8BrFfvkSc` for exact task tip20cdd69, stable origin `https://pals-app-git-agent-task-028p2-rich-profiles-pals8.vercel.app`. Its authenticated health currently reports all configuration checks false; do not confuse Ready build with ready app.
2. Independently review the three already-reviewed profile migrations (`20261006000100_owner_hometown.sql`, `20261006000200_rich_peer_profiles.sql`, `20261006000300_rich_peer_photo_gateway.sql`) against actual staged35-chain and normal migration tooling; dry run exact-target application and record hashes. No new schema strategy or dashboard-only schema edits. Apply only after exact-target review/preflight; verify history/grants/default-off/no backfill and existing account/policy state.
3. Configure only the profile Preview branch with APP_ENV=staging, exact Supabase ref/URL/publishable key, exact HTTPS APP_ORIGIN and callback. Provision the reviewed photo gateway credential only as server-only Secret on that branch; do not print, commit or bundle it. Keep Production/development/unrelated previews untouched. Preserve SMTP, identity confirmation and existing protection. If personal sign-in or credential provisioning needs human interaction, complete independent preparation first and provide the concrete next step.
4. Redeploy exact reviewed commit using existing Git integration/Vercel, verify source SHA, health and callback. Use existing signed-in Vercel access to protected Preview rather than weakening protection. Rich source gate stays off until prerequisite review/config checks pass; any required UI security-access action uses action-time confirmation.
5. Verify actual hosted sign-in, empty-profile app entry, owner hometown/photo click View/Edit, opt-in/off and peer personalized View-only profile, core Hangout/chat/People/safety flow and retained denies. No local test fixture account/secret is pushed. Controlled hosted test content must be agreed and recorded; do not send messages to real users without explicit instructions.
6. Fresh review, handoff and documentation-only shared status publication with exact remote receipts. Main application integration still waits for TASK-027 staged student/moderation/recovery acceptance. Hosted test availability does not certify public release or force a successor.

## Ownership and done

Coordinator owns shared records, exact hosted operations/runtime and user browser interaction. Fresh GPT-6 Sol medium task agents own meaningful source/preparation tasks with exclusive scope; fresh read-only reviewer checks target/migration/security plan. Tool does not expose speed and cannot verify Standard. No source change is planned until an observed defect needs its bounded contract.

Done for this substage means exact accepted hosted Preview is reachable and functional to the user, required scope checks pass or are explicitly bounded with actual evidence, independent review/handoff and shared records are pushed/main remote-verified. A merely Ready build or URL is not completion. Genuine hosted sign-in/access or secret blockers leave this substage incomplete, while independent preparation continues.

## Hosted availability receipt

See `agents/handoffs/TASK-028R.md`: exact reviewed P2 Preview, migrations/config/callback, genuine user sign-in, working map, reviewed audited source gate and no automatic consent. Only one verified staging user exists; hosted owner save/photos/consent, peer/multiuser and parent moderation/recovery acceptance remain unverified. Do not mark full release or parent complete.

# TASK-028R — Hosted test availability handoff

Date: 2026-10-12 (America/New_York).
Status: Hosted owner test available; full staged multiuser/student/moderation/recovery acceptance remains incomplete. No public launch or successor.
User requested hosted release availability and explicitly selected hosted TEST release; user personally completed Pals and Mapbox sign-in.

## Hosted artifact and scope

Stable test URL: https://pals-app-git-agent-task-028p2-rich-profiles-pals8.vercel.app
Exact source: P2 task20cdd69cc45398334dbd37aeaee29bd980d1a514 (reviewed app e27db7a3808a266d452878581e9d0c5a73f9b4cf).
Ready rebuilt deployment: dpl_F6rDoZBu3eQBsUMiL2hKr4dLidwS / https://pals-crltgauev-pals8.vercel.app. CLI/API metadata verifies project prj_aT8FyuzXMkQ46V3gPJQJ3msfiR45, team Pals/pals8, Preview target and exact Git source/alias. Deployment Ready alone is not functional acceptance.
Backend: Pals Staging ffabdrgsmtfylrehwmfo only. Production variables/backend, usepals.com and DNS were not changed. Automatic main builds from documentation/control publication do not release the gated P2 app on main.

## Applied changes and evidence

Fresh history35 through20261005000700 and official dry run preceded application of only reviewed profile001/002/003 with --skip-vault: no seeds or roles. Readback38, hometown column/grant under owner RLS, raw-rich client SELECT denied, anon rich-detail denied, authenticated detail grant and service-only photo resolver grant match review. Pre/post account/profile counts1, availabilitytrue/revision2 and all13 capability values/revisions were preserved; analytics and large safeguards remain off. Rich gate initiallyfalse and sparse preferences0; no content/user consent was backfilled.

Migration SHA256: 001576d40558dd899b309639e88e713c6ca246099e024c7dad7d48242b847e35b98; 0022ad4e999ff07378008c338f036f19865ef0971da649987d869616b349f3f33c0; 003d43fc01c24a322c3d6534c12361c26380e9ec4057017dc29e9e9581f24ff6ce2. Fresh source/security review hosted_test_security_review cleared exact migrations/plan before application. Migrations are roll-forward; no schema rollback was attempted.

Only P2 Preview branch got six configuration values matching exact staging ref/URL/publishable key, HTTPS APP_ORIGIN and existing public Mapbox token. The exact legacy JWT service-role credential was validated in memory for role/ref and stored as branch-only server Secret, with no key output/file/Git/client prefix. Exact new /auth/callback was added, retaining the old TASK027 callback and site URL; config diff showed one declared update before push and zero after, with19 undeclared remote properties preserved including confirmation, SMTP and TOTP.

Authenticated browser and OIDC HTTP health returns200/statusok with all6 checks true. User signed in through the real app and reached saved Hangouts without a new profile/photo prerequisite. Root saw actual owner Ella profile with existing academic/bio fields and honest empty primary/gallery/prompts; no generated hometown/photo content or fake UNC fixture was inserted. Hometown and photo save/View/Edit behavior was verified locally at accepted P2 source earlier, but not newly exercised with uploaded photos on this hosted account. Full owner save/consent, peer photo success/revocation and multiuser interactions remain hosted acceptance work.

Map failure was real vector tile403, not style JSON (200). Existing token cmuspy96z12bk2woheves3vbj allowed only old TASK027 origin. After user personally signed into Mapbox, root added only exact P2 origin, preserving old origin and three public read scopes. Old/new composite tile requests now200; unrelated origin403. Root refreshed signed-in Safari and visually saw campus streets/UNC tiles, enabled zoom and Back to UNC controls, with real saved list empty0. No GPS permission or locate-me was invoked. The initial saved-password Autofill action was rejected by automatic approval review; root did not retry or bypass it and used the user's deliberate Mapbox sign-in instead.

Anonymous application notifications HTTP403 and peer photo HTTP404 are observed through same-project development OIDC access; photo denial has private/no-store, CSP default-src none and nosniff. No app-user cookies were extracted. Ten public JavaScript assets referenced by sign-in HTML were scanned in memory: zero exact service-credential matches and zero server photo-helper identifiers. This is a bounded subset, not every authenticated route chunk. Prior local63 units/SQL/races/build/browser evidence remains historical, not fresh hosted proof.

## Control, audit and rollback

TASK-028R1 exact source afea7f47b546ffda36a9fbcf6dceb5868f35d96c passed fresh security review,10/10 Node fake-CLI tests and root real-schema rollback-only gate/retry verification. It fixes38-lane preflight and stale historical receipts after reversal; no fake Auth/role fixture or real emergency shutdown was performed. Root's independent readback: richgatefalse,prefs0,test audit rows0 after rollback. Task source and integration f61642cb0f80130da8cb7a464b7f7d21d8e51b72 were pushed/exact remote-verified; canonical control/decision main70a75c72100ae430dad8f2a72795c090b251813b was pushed/exact remote-verified. Main scripts are byte-identical to reviewed source; no P2 app/migration entered that13-path integration.

Root then used the clean reviewed task runner to enable only rich_profiles false→true under current user-hosted-test authorization. Request d254f97b-5727-4eb0-812f-131bb325812d, immutable audit b216761d-5d9c-494b-b508-65605ca352eb, executor shared postgres (not Ella's app identity). Separate readback confirms gate true,prefs0 and matching receipt; owners still must opt in. Authorizer Ella Nguyen; executor Codex; reviewer staging_controls_security_review (Solmedium; tool cannot verify Standard speed). Reverse uses reviewed source_gate expectedtrue/newfalse, fresh UUID/reason/authorization; reconcile an uncertain response by request UUID before retry. Routine availability/capability operations remain genuine Ella session; existing accepted one-way emergency-off remains for incidents, not ordinary QA.

## Remaining gates and cleanup

Only one verified staging account exists. No fake second UNC user, invitation or real-user message was sent; peer success and social/join/chat/block/report multiuser coverage cannot be certified from this owner session. Live moderation/action/recovery and complete staged student lifecycle remain TASK027 gates. TASK028/TASK028P app integration and public/domain launch stay incomplete. Source UI is unchanged from reviewed P2; no new cosmetic redesign was performed.

The CLI unexpectedly generated a project automation bypass during its first curl diagnostic. Root identified only that task-created entry by creation metadata, revoked it without regeneration, and independent project readback shows0 automation bypass entries. Deployment protection remained enabled; actual backend checks use supported same-project development OIDC and signed-in Safari. Temporary credential/environment files were removed after final verification. The task-specific Vercel CLI session was logged out successfully and its credential was cleared. Browser sessions remain for user testing. Shared dirty/staged checkout was preserved.

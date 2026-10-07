# TASK-028P profile visual and interaction plan

Source visual: `evidence/TASK-028P/profile-reference.png`, user supplied 2026-10-06, 793 × 1983 pixels. Existing live Pals reference inspected again on 2026-10-06; supplied profile image governs this screen. Pals owns the existing Baloo 2 / Nunito fonts, blue/white palette and rounded tokens; retain the Next.js web app and real data contracts rather than initialize another prototype.

Reading this as a friendly, photo-led campus profile. DESIGN_VARIANCE 3, MOTION_INTENSITY 2, VISUAL_DENSITY 4. Light theme follows the explicit source. Use only ordinary feedback/focus transitions; no ornamental motion or new UI framework.

## Composition

Reference content spans x34–759 (725 px). Header is about 62 px tall; primary image begins y81, 725 × 358 (2.02:1), radius about 23 px. Name follows with large rounded display type (~58 px), narrower verification badge on the same row when it fits, then hometown/bio. Academic facts are three quiet rows in one pale blue surface. Two equal actions sit together. Gallery uses two columns with ~14 px gap, four images near 1.3:1. Display section headings are about 40 px; body is about 26 px at source density. Conversation panels are pale blue, question in blue bold and answer in dark body text.

Use a centered readable canvas on desktop with comparable maximum content width; adapt margins, font sizes and touch targets at 390/320 px. Primary aspect ratio and two-column gallery remain. Long names wrap without colliding with badge. Maintain 44 px minimum controls, readable contrast and visible keyboard focus. Current primary navigation stays available; any compact back/options treatment is local to the profile.

## Real interaction rules

Owner: readable profile by default, Edit details opens grouped fields using existing revision save, cancel restores saved values, failure preserves draft and displays a useful inline retry/conflict message. Separate photo editing retains the original private slot/add/replace/remove contracts and upload preview/revocation cleanup. Preserve all rich fields even when they are not in the source image. Blank fields/photos remain optional and have honest actionable owner states. Never add generated personal content to a real account.

Peer: current authorized People text and existing friendship/DM request controls can adopt the same visual system now. Add friend reflects actual pending/incoming/accepted state; Say hi opens the consent-based first-message flow. Keep report/block available in the options area, recover focus after dismissal, and clear the profile on confirmed block/access loss. Expanded hometown/photos/prompts are governed by Proposed ADR-0036, not inferred from the screenshot.

## Verification

Capture before and after at source width 793, desktop1280 and mobile390/320. Inspect empty owner, populated owner, editing, invalid/photo selection, cancel/save, photo changes/reload and stale save. Inspect authorized peer and unavailable/denied states plus genuine friend/DM actions when the fixture permits. Review the provided image together with actual rendered captures, evaluate typography/layout/colors/images/copy and record differences/iterations in project-root design-qa.md. An owner-only pass does not claim full rich-peer completion. Keep the detached current preview live until the new isolated build is ready.

## TASK-028P1 requested corrections

Continue the same reference language (variance3, motion2, density4). Place a Phosphor map pin and optional “From {hometown}” directly after name/verification and before bio. Each owner edits their own optional city/region; absence creates no fabricated Raleigh/default value. Keep wrapping safe at320px and matching Nunito body sizing at793.

Saved primary/four extras become keyboard-accessible photo triggers without adding a permanent overlay to the image. Click opens a small modal offering View photo and Edit photo. View displays the existing private image at a contained large size; Escape, Close and backdrop dismiss and return focus to the trigger. Edit dismisses and focuses the matching slot's existing replacement input; no searching through an unrelated control list. Preserve selected-file preview, revisions, optional onboarding and primary-removal guard. Owner edit choices never appear for peers. Expanded peer rich content remains conditional on ADR-0036.

Browser QA will cover all five triggers, primary and extra viewing, focus/keyboard/backdrop, correct-slot edit/replacement/reload, hometown save/clear/boundary/stale-draft, a second owner with different data, and peer absence of edit controls. Keep source comparison and320/390/793/1280 geometry evidence.

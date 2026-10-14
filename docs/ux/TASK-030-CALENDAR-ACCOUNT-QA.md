# TASK-030 Calendar and account verification

## Local candidate status

The requested Calendar, bio and account navigation changes are implemented at application commit `5920f1d9f98511d922640f6bec2fe717f6c743dc` on `agent/TASK-030-calendar-account`. The user accepted TASK-029's local visual direction; this follow-up preserves that layout. TASK-030 remains incomplete until TASK-027/TASK-028 staging acceptance and reviewed application integration. No hosted deployment or public domain change occurred.

The omitted bio sentence count was interpreted as two and disclosed to the user. Hosting is yellow, Attending green, and All hangouts blue other available plans. These independent checkboxes select the union of their categories; hosting takes precedence over attending. Calendar creation is removed. The screenshots supply layout direction, not default dates, identities, photos or access permissions.

## Source and runtime

The contract was published before workers started: contract branch `2302b7082033e763ffccf0bb8dfdbc00592f86e5`, canonical main `9069fce76f140c13012ae68469661c215ef8c224`. The task branch includes exact reviewed TASK-029 dependency `99f27d6a7820afee2eedc2118e99410bb06ca5d7`, retaining canonical control records. Fresh GPT-6 Sol medium workers and reviewers handled bounded slices; tools cannot configure or verify Standard speed.

Runtime uses the named disposable `pals-task029-disposable` backend: API 55521, database 55522, local mail 55524, 38 existing migrations. Existing local stacks and the dirty original checkout were preserved. Fictional Maya/Alex/Jordan and normal caller RPCs supply plan/People fixtures; additional fictional Account fixtures test Auth. Images are synthetic letter/solid-color PNGs. No real-user messages, credentials or photos were changed.

The production QA export is `/private/tmp/pals-task030-runtime`; final tracked apps/packages/supabase/tests match the source except two documented untracked adapters: `lib/feature-runtime.ts` recognizes the IPv6 loopback proxy, and `lib/config.ts` uses fixed local callback origin 3035 to match the disposable provider's existing configuration. The proxy routes `[::1]:54321` to 127.0.0.1:55521 without touching the unrelated IPv4 stack. Delivered guards/configuration remain unchanged. A temporary GET/HEAD redirect on 3000 forwards old preview links to 3035; it is outside the repository. Local preview is `http://127.0.0.1:3035/calendar` and is left running with fictional Maya.

## Verification results

- Exact final source and QA production webpack builds pass, including web TypeScript. Full workspace ESLint, admin TypeScript and 80 unit tests pass with zero skips. The 80-test run includes final bio parsing at `56cd797`; the subsequent `5920f1d` header/CSS change passes scoped lint/type/format and final builds.
- Calendar tests cover campus date/range/month boundaries, repeated DST hour, 18:30 placement, earlier/later events, cross-day plans, overlapping lanes, midnight 44px controls, source selection and identity comparison. Queries apply membership/host filters before their 101-row limits. Actual local PostgREST proves attending selection and other-plan anti-join work under existing column grants; no RLS/grant change.
- Real local browser checks cover Day/Week/Month, previous/Today/next, independent filters and all-off empty state. Pointer placement over a blue event opens a preview without click/focus activation. Enter/tap also open it; Escape returns focus to the trigger without reopening. Blue preview shows View Hangout and Join. Joining the 18:30 fixture through the real UI changes it to green; fresh attending/hosting previews omit Join. Calendar exposes no create action.
- Profiles: avatar links directly to the owner page. Bio is unlabelled below facts; owner bottom Safety/Analytics/Attendance/Account/Sign out links are present, and peer utilities are absent. Three sentences reject with draft retained; two persist. Actual HTTP save tests additionally reject three quoted English and three unspaced CJK sentences, accept two, preserve unchanged legacy bios on unrelated edits, and ignore a forged profile-name input.
- Account real server-action/HTTP checks: name persists without clearing optional fields, stale revision rejects, anonymous/current suspension denies, wrong current password and non-UNC email reject. Password update authenticates with the new fictional password and rejects the old one. Email remains current while the new approved address is pending. Both real disposable-mail confirmation legs pass: first message-only callback returns to fixed `/account`; final PKCE callback returns through `/continue`, then confirmed new-email sign-in passes live access. Provider confirmation/security settings were not altered.
- Privacy checks: previews exclude private meeting instructions and raw coordinates; repeated identity reads no longer falsely deny due to object-key order. People opt-out removes subject names/photos; preference is restored to its prior fictional state afterward. Closed blue plans expose no Join. Anonymous preview returns 404. Actual cross-tab sign-out clears Account editor, old email and unsaved name draft before redirect. Hidden/BFCache and overlapping Auth-token concealment are source reviewed and unit covered where applicable; hidden-only provider timing was not independently browser tested.
- Layout checks at actual CSS 1280, 820, 390 and 320 widths show contained page widths. Week/Month use named keyboard-focusable horizontal scroll regions and a phone scroll hint; Day remains a single-day view. Owner/peer/Account phone layouts are readable, including final stacked Account heading. A temporarily unconfirmed fictional Account fixture retains visible Safety, Sign out and avatar at 320px; confirmation was restored. The current-day highlight and event times derive from campus time, not the reference image.

## Screenshots

JPEGs in `evidence/task030/` contain only fictional content. Filenames refer to actual CSS viewport widths; screenshot encoding may resize the pixels. SHA256 hashes are recorded in `evidence/task030/manifest.json`.

- `calendar-blue-1280.jpg`: blue 18:30 preview before the real Join; `calendar-attending-1280.jpg`: after membership acknowledgement; `calendar-personal-1280.jpg`: blue category off.
- `calendar-final-1280.jpg`: final source, actual pointer preview of the preserved 16:47 blue fixture with View/Join.
- `calendar-month-1280.jpg`, `calendar-month-390.jpg`, `calendar-week-390.jpg`, `calendar-week-320.jpg`: desktop Month and contained phone grids.
- `profile-owner-1280.jpg`, `profile-owner-390.jpg`, `profile-owner-320.jpg`, `profile-peer-320.jpg`: unlabelled bio, own utilities and peer composition.
- `account-1280.jpg`, `account-390.jpg`, `account-320.jpg`: separate forms and final heading layout.
- `unconfirmed-safety-320.jpg`: Safety recovery access before confirmed-email readiness.

## Remaining release work

TASK-027/TASK-028 hosted student/peer, moderation and recovery acceptance still gates main application integration. Provider-specific nonce-required password/MFA paths and hosted email delivery were not exercised here. There is no green GitHub CI claim for this candidate. TASK-029 detail-map fallback remains available; its local Mapbox token was absent, so new detail tiles/pin/zoom stay unverified. Resolve these existing gates before deploying the combined candidate. ADR-0038 stays Proposed; no new auth strategy, schema, provider or privacy decision was executed. No automatic successor is dispatched from this incomplete parent task.

# Core User Flows

## Map feedback amendment 2026-10-14

TASK-032P4 uses a slight upward pin lift with no hover halo or outward scaling, retaining the map preview. Hangouts heading now omits campus decoration. Normal location/period explanation, result count and routine Refresh control are removed. Filters and viewport changes still use existing authorized reads; actual errors retain retry and empty states remain useful. This display cleanup does not change approximate locations or backend/privacy behavior.

## Profile feedback amendment 2026-10-14

TASK-032P3 removes the visible gallery Move rows, More about you display and duplicate Photo controls panel at Ella's request. Saved fields remain in Edit profile. Extra photo options → Photo position uses the same owner revision-CAS reorder; desktop drag remains. Edit photos focuses the actual gallery. A locally served school logo replaces the checkmark in the shared owner/peer name row for recognized UNC campuses, under the existing source condition. It identifies school affiliation and does not add an enrollment assertion. Contextual cleanup retry appears only when needed; privacy/footer utilities remain. Existing TASK-032 acceptance/sign-off/hosted gates are unchanged.

## Interaction and photo amendment 2026-10-14

TASK-032 local candidate: Create Hangout → choose broad public map place/label → Continue → existing event details → Create. Back preserves both steps; no automatic location permission. Saved pins now lift their visual child3px on hover/selection with a fixed outer target (P4 supersedes the earlier enlargement); previews retain forgiving pointer travel plus explicit Close/Escape/reopen. Own profile photo edit → in-place choose/drop/crop → explicit Save through owner Storage/CAS → authorized UI refresh. The same modal serves optional rectangular slots; existing photos expose View/Replace/Reposition/Delete and desktop drag or the Photo position selector inside extra-photo options reorder up to four. Zero photos remains valid. Inline profile editing now includes name with existing Account validation; trusted school/email remain readonly. Recrop uses the stored rendition, not an archived uncropped original. Runtime evidence and remaining device/fault/staging/sign-off gates: `TASK-032-INTERACTION-PHOTO-QA.md`.

## Hangouts map amendment 2026-10-14

TASK-031 local candidate uses a compact Hangouts/campus/Create row and large rounded Mapbox map with activity emoji pins, independent Today/Tomorrow/This week/Later checkboxes and an authorized public hover/focus/tap View/Join preview. The alternate list is below the map. This replaces the historical numbered-pin/persistent-rail presentation for saved discovery. Four-bit masks filter before the101-row probe with the original seven-argument RPC, projection, epoch/revalidation, grants and ranking unchanged; legacy upcoming/all remain compatible. Periods are disjoint upcoming starts in America/New_York, with Tomorrow taking precedence at the week boundary. No private instructions or GPS are stored in browse memory. Current behavior, evidence and unfinished responsive/lifecycle/staging acceptance are in `TASK-031-MAP-QA.md` (under docs/ux); historical sections below retain their original task scope.


## Calendar and account navigation amendment 2026-10-14

TASK-030 local candidate: avatar → own Profile → bottom Safety/Analytics/Attendance/Account utilities. Edit profile changes academic/bio/optional fields; Account changes name or requests an email/password update through existing caller Auth. Current confirmed email and pending email remain distinct. Bio appears below facts without a visible heading; new/changed saves allow at most two sentences, preserving unchanged legacy content. Peer pages contain none of the owner's utilities.

Calendar → Day/Week/Month → choose Date (UNC time) or previous/Today/next → toggle Hosting/Attending/All hangouts independently → hover/focus/tap event → authorized public preview → View Hangout or Join an eligible blue plan → acknowledged membership shows green → existing detail/chat coordination. Calendar has no Create action. Hosting is yellow; All hangouts means other available campus plans. Existing consent, block, live access and release gates remain authoritative. This local candidate does not complete TASK-027/TASK-028 staged acceptance or application integration.

## Initial-release scope amendment — 2026-09-26

[Accepted ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) narrows the initial UNC release only. Read the general flows below with these initial-release limits: campus-visible creation only, no restricted visibility/eligibility/invitations or friend-attendance context. People peers see existing authorized text; friendship and consent-based DMs remain. Chat/notification updates use existing refresh/polling behavior with honest expectations. Post-Hangout prompt is private owner attendance only; extra expectation/comfort questions are deferred. No peer photos, public attendance history or safety-rating claim. Owner rich editing/photo onboarding, UNC Auth email delivery and all safety/privacy flows remain required.

## Discover → Join → Attend
Open → Hangouts map → pan/locate → tap pin → preview/detail → inspect attendees/friend context → Join → hangout chat → coordinate → attend → attendance prompt → optional friend requests.

## Create
Map → + Create Hangout → title → approximate time → public/approximate location → optional private exact detail → visibility → optional eligibility → publish → pin + chat → optional co-hosts → attendees coordinate details.

## People → DM/Friend
People → browse/filter → profile → first-message request → recipient replies/accepts → DM thread → optional friend request → future hangouts/invites.

## Blocking
Block → server-side separation: DMs stop, new friend requests/invites suppressed, restricted discovery reduced, private access enforced.

## Host Removal
Host/co-host → remove attendee → access updates → removed user retains ability to report abuse.


## Optional rich profile sharing — ADR-0036

Owner avatar → own Profile → Profile options → Profile sharing → inspect current People text and selected-photo/hometown/prompt preview → explicitly acknowledge future edits/replacements → turn rich sharing on. This separate choice starts off for every account. Turning People sharing off also turns rich sharing off; turning People sharing on later does not restore it. The owner can reach Profile sharing from verification or closed-availability screens and turn rich sharing off while eligibility or source availability is lost. Explain that previously saved bytes/screenshots cannot be recalled.

Authorized peer profile → selected hero → name/UNC school logo when recognized and eligible → optional self-declared hometown/pin → bio/academic facts → real friendship/message controls → optional two-column gallery → optional conversation prompts. Missing optional content is omitted honestly. Each account supplies its own content; illustrative test people/images are never real-user defaults. Clicking an owner's saved image offers View/Edit; clicking a peer image offers View only. Dialogs support keyboard, Escape/backdrop close and focus return. Authorization loss clears rich content and presents neutral recovery; blocking clears the whole peer view. ADR-0036 supersedes the earlier peer-rich presentation deferral only for the accepted bounded disposable-local implementation, preserving all hosted/integration release gates.

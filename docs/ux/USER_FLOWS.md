# Core User Flows

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

Owner avatar/profile menu → Profile sharing → inspect current People text and selected-photo/hometown/prompt preview → explicitly acknowledge future edits/replacements → turn rich sharing on. This separate choice starts off for every account. Turning People sharing off also turns rich sharing off; turning People sharing on later does not restore it. The owner can reach Profile sharing from verification or closed-availability screens and turn rich sharing off while eligibility or source availability is lost. Explain that previously saved bytes/screenshots cannot be recalled.

Authorized peer profile → selected hero → name/current UNC email badge → optional self-declared hometown/pin → bio/academic facts → real friendship/message controls → optional two-column gallery → optional conversation prompts. Missing optional content is omitted honestly. Each account supplies its own content; illustrative test people/images are never real-user defaults. Clicking an owner's saved image offers View/Edit; clicking a peer image offers View only. Dialogs support keyboard, Escape/backdrop close and focus return. Authorization loss clears rich content and presents neutral recovery; blocking clears the whole peer view. ADR-0036 supersedes the earlier peer-rich presentation deferral only for the accepted bounded disposable-local implementation, preserving all hosted/integration release gates.

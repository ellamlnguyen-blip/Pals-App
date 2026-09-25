# TASK-018B attendance interaction plan

Status: Reviewed dependent plan; implementation awaits ADR-0022 acceptance and TASK-018A
Date: 2026-09-24

## Design read

Reading this as a small private utility for UNC students after a Hangout, with Pals' friendly Carolina-blue and white language. The live usepals.com desktop reference, inspected on 2026-09-24, uses a white canvas, soft blue rounded feature area, rounded heavy type and a map-led layout. The attendance page should use the current app's Nunito and shared tokens with far less visual weight than the map. The reference's “event” wording and Memories navigation do not change this product's Hangout terms or five destinations.

## Route and layout

The owner route is `/attendance`, reachable from Calendar when ready and the account menu whenever signed in and active. Desktop: a narrow introduction and a single readable list region inside the existing content width. Tablet and phone: one column, clear separation between Hangout reference, own response, eligibility and action. At 320px, full IDs can wrap or scroll within their own region without page overflow, and buttons remain touch sized. Use existing semantic blue/white surfaces, ink, border and focus tokens; do not add decorative progress or social proof.

## States and copy

| State | Presentation and action |
| --- | --- |
| Initial/loading | Mask prior actor content; show “Checking your attendance…” without source text. |
| Empty or attendance gate off | “No attendance records are available right now.” Offer Retry. A's zero-row list cannot distinguish these cases, so do not claim the owner has no past Hangouts. |
| Actionable, unanswered | “Did you attend this Hangout?” Two exclusive answers and Save. “Your answer is self-reported. Joining a plan does not confirm attendance.” |
| Actionable, answered | “Your answer: I attended” or “I did not attend”; Change opens the same two choices. |
| Window closed, answered | Show own saved answer read-only and explain that corrections are closed; never show an answer for another account. |
| Window closed, unanswered | “No answer was saved. Answering has closed.” Keep the owner ID row visible and read-only. |
| Within window, not actionable | “Answering is unavailable for this Hangout.” The projection also covers pre-start cancellation, so give no reason or retry promise. Keep any own saved state only if a fresh owner read permits it. |
| Hidden source | Show `Hangout ID` and exact UUID only. No title, host, time, place or deep link to denied detail. |
| Gate/account denial | Remove all owner content and show a neutral unavailable state with sign-in or retry as appropriate. |
| Stale or uncertain save | Recheck the exact own row. Show only confirmed saved state; otherwise ask for a fresh deliberate choice. |

The general correction explanation is “You can change your answer for 30 days after attendance opens.” An exact deadline may be calculated from a currently authorized source schedule using ADR-0022's end-or-start-plus-two-hours opening and 30-day rule. Show it only when the row is currently actionable. Do not show that deadline when schedule or source access is unavailable, and do not add a new attendance timestamp projection. The database's open/closed flag remains authoritative if the clock boundary races the UI. A `/safety` link says “Report a concern separately” and never treats a response as a report.

## Interaction checks

Use native buttons/radio controls and visible focus. Save is disabled until one answer is selected and while a request is pending. Tab order is heading → own rows → answer controls → Save → Safety link → pagination. Announce confirmed or uncertain results in a polite status; denial uses an alert. On actor switch, tab hide/restore or gate revocation, clear sensitive content before refetch. Source enrichment must not outlive the current authorization ticket. Verify desktop 1280px, tablet about 820px, phone about 390px and 320px stress, plus light/dark and reduced-motion behavior. No animation is needed to convey attendance state.

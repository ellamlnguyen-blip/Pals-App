# TASK-009 Calendar interaction plan

Read as a campus agenda for students, using Pals' existing rounded Nunito typography, white/blue canvas, shared spacing and accessible controls. Leon Taste reviewed; product utility takes priority over marketing patterns (variance 3, motion 1, density 4). Direct browser inspection of usepals.com on 2026-09-23 confirmed the friendly blue/white map-led reference; its alternate terminology/navigation is not authoritative.

Calendar opens a saved-only local agenda. Day/Week and Discoverable/Joined/Hosting controls sit above a campus-date picker, previous/next and Today controls. Monday–Sunday weeks and all dates/times explicitly use America/New_York. Native links/forms keep keyboard navigation and full fresh requests straightforward; browser history restoration refreshes the page. No cached client result races.

Desktop agenda uses a compact date column and flexible title/time/place column. Phone stacks these with wrapping controls and no fixed-width grid. Day headings group overlapping records; ongoing records show their actual start/end on each overlapping day, and unknown ends appear only on the start day with “End not set.” Cancelled records are visibly labeled in personal filters. No attendance is inferred.

Loading, invalid selection, safe error/retry, denied access, empty and truncated results have explicit text. Bound all results to 100 with a 101st-row sentinel; membership/ownership filters apply before limits. Repeat bounded public/caller-membership queries before serialization. Detail uses existing saved route; no private detail, peer profiles, roster or historical membership enters Calendar.

Verify DST 23/25-hour days, Monday weeks, interval boundaries, membership changes/cancelled records and >100 campus records; render desktop/phone and exercise keyboard/date/filter/detail-return. Preserve local-only guard/default-disabled database gate.

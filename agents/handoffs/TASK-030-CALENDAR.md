# TASK-030 Calendar implementation handoff

Status: Calendar slice implemented on `agent/TASK-030-calendar-account`; shared TASK-030 review, runtime acceptance and integration remain open.

## Outcome

- Replaced the Day/Week agenda with a Week-default time grid, Day time grid and Monday-first Month grid. It uses current campus date, campus date picker, previous/Today/next controls, responsive contained scrolling and 24-hour coverage for plans outside the reference 8 AM–8 PM window.
- Hosting (yellow), Attending (green) and other available campus Hangouts (blue) are independent checkboxes. Hosting wins over attendance; all-off is explicit. Existing cancelled personal plans retain a Cancelled label. Old single-filter URLs still resolve to equivalent categories.
- Each category is queried before the 100-result display limit. The public category pages until it finds 101 nonpersonal plans; personal queries retain source filters. Both reads are compared after a fresh ready-state check. No global discovery cap is used to filter personal plans away.
- Hover, focus and tap open a no-store public preview. It reuses the saved detail and visible roster authority, enriches only those current roster members through People consent, rechecks detail/identities/actor, and projects only title, time, approximate public place, description, neutral roles, allowed photos and current Join eligibility. No private instructions, raw profile/Storage path or denied identity enters the JSON response. Join calls the existing membership action, refreshes the Calendar after an acknowledged save, and stops on uncertain outcomes. The preview closes on Escape, outside interaction, navigation/BFCache, or denied refresh.

## Evidence

- `node --experimental-strip-types --test tests/calendar.test.mjs`: 3 passed, including spring/fall DST lengths, Monday weeks, month boundaries, category union, unknown ends and interval boundaries.
- Scoped ESLint on Calendar TypeScript: pass without warnings.
- `tsc --noEmit -p apps/web/tsconfig.json`: pass at final local check.
- Prettier applied to owned files.

## Remaining review and verification

- Root coordinator owns full build, disposable local backend HTTP tests, desktop/tablet/320–390px browser QA, visual comparison, review, remote publication and integration. No hosted operation was performed here.
- The preview shows the first authorized roster page and marks further people as “More”; it never implies a total count from a partial page. Photos remain subject to the People photo route's live authorization.
- The 24-hour civil time grid can place both occurrences of a repeated fall-DST hour in the same visual hour. Both event controls remain present and have their true offset in the preview; inspect the overlap in browser QA.

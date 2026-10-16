# TASK-035 UI implementation handoff

Branch: `agent/TASK-035-compact-controls`; starting HEAD `3aa41ad` (canonical main `10e5421` plus reviewed local TASK-034 dependency `70537ad`). This handoff covers only the Calendar and Pals presentation changes. No commit, push, merge, hosted action, or shared status record was made by this task agent.

## Outcome

- Calendar keeps an accessible hidden h1. Its compact category fieldset, centered date range, and Day/Week/Month group share one row at tablet width. The previous/Today/next controls and date input sit below. At phone width, the date, category controls, and view tabs use separate rows; all interactive labels/buttons retain at least 44px height.
- Pals moves its existing native GET search form beside the heading on available browse pages. At tablet width the form uses two columns; on phones it stacks. The heading uses the Calendar primary text blue. The year input is a native select with `Any year`, a current-year-centered 25-year range, and an additional selected option for any valid deep-link year outside the range. The `1900–2200` server URL contract remains unchanged. Major placeholder is `Major`.
- Error/unavailable Pals states keep their heading without displaying unusable filters. Existing RPC inputs, paging, card destinations, authorization, and ranking were untouched.

## Files

- `apps/web/app/calendar/calendar-client.tsx`
- `apps/web/app/calendar/calendar.css`
- `apps/web/app/people/page.tsx`
- `apps/web/app/people/people.css`

## Checks and limits

- `git diff --check` passed; Prettier check passed after formatting `people/page.tsx`.
- Attempted production web build and typecheck. The disposable worktree lacked installed dependencies; pnpm attempted registry downloads and failed with `ENOTFOUND`. A temporary link to the primary checkout's older dependency tree allowed a TypeScript pass to start, but it reported missing/currently mismatched dependencies and types in untouched files (`@phosphor-icons/react`, `RichPeopleDetail`, `react-easy-crop`, etc.). It reported no errors in the four changed files. The temporary links were removed.
- `https://usepals.com/` was attempted with the web tool but was inaccessible. The repository design direction records the visual reference.
- Rendered 1280/767/375 screenshots, interaction checks, build, and complete typecheck remain for the coordinator's integration environment with current dependencies. In particular, visually inspect the longest week label at 767px, the 375px category row, search/clear, preselected deep-link year, keyboard labels, and horizontal overflow.

## Coordinator verification, 2026-10-16

- Copied only the TASK-035 web source into the existing disposable local runtime, preserving its local-only config and environment. `next build --webpack` passed, including TypeScript.
- Rendered Calendar and Pals at 1280, 767, and 375 CSS pixels in the local browser. Screenshots are in `docs/ux/evidence/task035-local/`. At 767px, Calendar's legend, date range, and view tabs share a row with 16px between the legend and date and more space between the date and tabs. The Pals form sits beside its heading. Both pages had `document.documentElement.scrollWidth === innerWidth` at 767 and 375px.
- Verified Calendar Month selection changes the pressed tab, date label, route, and visible month grid. Verified Pals graduation year and major submission (`?year=2028&major=Biology`), preservation of a valid `?year=2050` deep link in the native select, and the Clear link. Browser accessibility snapshots expose Calendar's hidden h1, labeled category group and view group, and the Pals select and major input by their labels. The visible Pals heading color resolves to `rgb(39, 109, 169)`.
- No backend, authorization, ranking, or data model behavior changed. The task remains gated from application-main integration by the parent TASK-032/033/034 signoff and release constraints.

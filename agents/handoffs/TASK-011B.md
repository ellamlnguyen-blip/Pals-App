# Handoff — TASK-011B local People UI

Date: 2026-09-23
Branch/worktree: `agent/TASK-011B-people-ui` / `/private/tmp/pals-task011b-people-ui`
Starting main: `6cf286ed72269ac603cb298b30a52d5fba74ecf1`
Latest verified main merged before handoff: `46f3256cdc4ffc44bb8c3f68285c441586964392`
Task branch remote SHA: verified after this handoff commit and sent to the coordinator separately.

## Outcome

The local loopback web app now has a ready-only People directory with literal name search, graduation-year and exact-major filters, 24-row ID-only cursor pages, text detail, recoverable unavailable/error states and hard navigation that rechecks server authority. An explicit focus token restores the originating card after detail; when the card disappears after block or opt-out, the People heading takes focus. The primary Hangouts/Calendar navigation links to People only for the validated local target.

The owner profile shows the exact card/detail text preview and links to `/people/privacy`. That active-owner route remains available outside ready-only browsing, including gate-off/readiness-loss opt-out. It distinguishes the stored sharing choice from effective discoverability, shows an accurate preview before enabling opt-in, and never claims photos or excluded fields are shared. It lists only outbound blocked account IDs, with exact-ID confirmation for unblock. A People detail block confirmation clears all peer text and controls immediately, including while the write or recheck is uncertain. No peer photo, friendship, DM, Hangout authorization or schema change was added. People page and action responses are no-store.

The browser UI uses the reviewed TASK-011A API and the later ID-only cursor correction on main. The UI sends only `p_after_id`; it rejects legacy `afterName` URL parameters and repeated/extra filter parameters. The API derives its own name sort key. A malformed repeated detail `from` value falls back to `/people`.

Exact-commit review follow-up: a block action now keeps the cleared status view for every outcome. If the write or recheck is uncertain, its message persists with a hard link to outbound blocked IDs and a separate return to People; no peer text or retry control reappears. Successful hidden and visible-but-not-blocked outcomes also leave the cleared status visible, so navigation is an explicit owner choice.

## Verification

- Web and admin production webpack builds, direct TypeScript checks, repository Prettier and zero-warning ESLint, `node --test tests/*.test.mjs` (17/17), and `git diff --check` passed. `pnpm check` could not bootstrap offline symlinked dependencies in this checkout (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`); direct equivalents passed.
- The real local authenticated Auth/Storage/PostgREST suite passed with `WEB_TEST_ORIGIN=http://127.0.0.1:3000`. It includes People route no-store headers, malformed repeated return URL, valid ID-only cursor, legacy name-cursor rejection, direct authenticated cursor RPC after a long raw name, bilateral block/opt-out and existing profile/photo/Hangout regressions. The backend correction had independently passed two clean resets, 308 pgTAP assertions per reset, concurrency checks and warning-level schema lint before UI verification.
- The follow-up authenticated HTTP regression directly posted to People Server Actions using their production manifest IDs. It asserted `Cache-Control: no-store` on a successful opt-out, invalid block input, signed-out privacy action and a gate-revoked uncertain block. The uncertain response contained the check-before-retry message and no peer name. The local browser surface was unavailable during this follow-up, so the durable cleared client view was checked by code review and the action outcome was exercised over real HTTP; no second visual browser claim is made.
- In the production-build browser, verified ready browse/detail, loading fallback, name/year/major search and no-results, sharing opt-in/out, block confirmation and immediate whole-detail clearing, bilateral discovery hiding and unavailable known-ID detail, outbound ID-only block management and exact-ID unblock. Keyboard focus moved to detail heading, restored to the source card on Back, moved to the cleared status heading during block, then to the People heading when the card was gone. With a peer detail open, the peer opted out through its own caller RPC; ordinary Back returned to a fresh empty directory with heading focus, and direct known-ID detail showed no peer text.
- The active-owner privacy path remained available when the local People gate was off and readiness was lost; stored choice stayed distinct from effective access and opt-out succeeded. Browser captures covered desktop, 390px and 320px, including navigation, list, detail, privacy and block management. At 320px the live People/detail width was 288px with no document overflow. Screenshots: `/private/tmp/pals-task011b-shots/people-desktop.png`, `person-desktop.png`, `person-320.png`, `privacy-desktop.png`, `privacy-390.png`, `people-320-nav.png`, `blocked-320.png`, `blocked-desktop.png`, `profile-preview-desktop.png`. The older `privacy-320.png` full-page capture showed a capture-only reflow and was not used as layout evidence.
- Browser fixtures were removed. Final local database query showed People gate false, Hangout gate false, task-011B users 0, People preferences 0 and blocks 0. Next, local Supabase and Lima were stopped.

## Review and integration

The coordinator should review the final task commit, perform the independent UI/security review, integrate accepted code and this handoff into canonical main, update shared task/operations records, push and remote-verify main. This branch does not edit shared NOW/BACKLOG/CURRENT_STATE/CHANGELOG/ADR/contract files. No hosted operation was performed. Standard speed was the requested app preference; the task dispatch API exposed model and effort but no speed selector, so speed was not independently verified.

# TASK-030 profile and navigation slice

Branch: `agent/TASK-030-calendar-account`. Baseline: canonical contract `9069fce` plus reviewed TASK-029 `99f27d6`.

## Outcome

- Header avatar is an accessible direct `/profile` link. The existing header Safety link remains; signed-in students without profile readiness can still sign out from the header.
- Owner profile places Safety, Analytics, gated Attendance, Account and Sign out at the bottom. Peer profile composition has no owner utility links. The existing shared summary already renders an unlabelled bio beneath facts.
- Profile editing directs name/login changes to Account. Its save action takes the current stored real name, so crafted or stale profile forms cannot change it. Revision conflict handling remains in place.
- Changed and new bios use shared two-sentence and 2,000-character validation in editor/server; unchanged legacy bios survive unrelated saves. A sentence ends at `.`, `!` or `?` followed by whitespace or the end. Web-address internal dots, initials and common titles/abbreviations are excluded. An unfinished final sentence counts as one. This is application-only enforcement; no SQL constraint or historical content migration was made.

## Evidence

- `node --experimental-strip-types --test tests/profile-bio.test.mjs tests/onboarding.test.mjs`: 5 passed.
- `tsc --noEmit -p apps/web/tsconfig.json` and `tsc --noEmit -p packages/validation/tsconfig.json`: passed after resolving the disposable worktree's ignored validation symlink to this checkout.
- Scoped ESLint and Prettier checks passed.
- `https://usepals.com/` was unavailable through the browsing tool. Existing design direction and tokens were used. Coordinator owns integrated browser QA across desktop/mobile and local backend states.

## Integration boundary

No schema, provider, gate or peer data-read change. Account and Calendar files are owned by other TASK-030 workers. This slice is not a completed product task; coordinator still reviews, runs integrated runtime QA, publishes and verifies remotes.

## Post-review bio fix

Source review found that punctuation inside closing quotes and unspaced CJK stops were undercounted. The shared validator now counts English `.`, `!`, `?` followed by closing quotes/brackets and then space/end, plus `。！？` without requiring spaces. Existing URL, decimal and honorific exclusions and unchanged legacy-bio handling remain. Focused tests cover two accepted and three rejected quoted/CJK sentences; onboarding and legacy tests still pass. Scoped validation/web type checks, ESLint and Prettier passed. Coordinator owns final integrated verification and publication.

## Mobile access correction

The shared phone breakpoint hid the header Safety link while an account without profile readiness cannot use owner-profile utilities. A limited-access header marker now keeps Safety, Sign out and the avatar visible at phone widths, with compact spacing and the campus label hidden only in this state. Ready and signed-out header layouts remain unchanged. Scoped web type check, ESLint and Prettier passed; coordinator owns the actual 320px fictional not-ready account browser check.

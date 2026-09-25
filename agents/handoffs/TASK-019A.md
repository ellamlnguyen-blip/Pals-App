# TASK-019A handoff — local analytics adapter and consent control

Status: implementation on task branch; exact-tip review and authenticated rendered acceptance remain with coordinator. Stage B is not dispatched by this handoff.

## Branch and baseline

- Branch: `agent/TASK-019A-analytics-foundation`
- Starting main: `385c9ea155f06f3bdb379f05ee1f7613e92a4d87`
- Independently verified implementation push: `73e5b249a216a196a565d6ebd6fc9bdfc59504bc`
- Independently queried remote main during handoff: `bd1de5bfc4beb38543b36535ae6d29c9f34d0a09`
- This handoff is committed after the implementation receipt; the final handoff commit tip is independently verified in the agent's completion message. No task code was merged to main here.

## Outcome

- Added a browser-only, memory-only analytics controller with the 14 accepted event names and a one-argument capture signature. Runtime validation rejects unknown names and extra arguments, including JavaScript/cast callers. The web typecheck asserts invalid names/properties fail compilation. No product event call site was added.
- Added a no-store, owner-authorized account access route. It returns local sink configuration only for confirmed onboarding/ready accounts. Every capture rechecks the current account, then compares the same tab generation immediately before sending. Focus, pageshow and sign-in transitions pause capture; a pending transition cannot resume through focus. A confirmed same-account resumption keeps the visit ID. Sign-out intent clears consent immediately in every listening tab, even if later cancelled. Revocation, denial, mismatch or uncertain failure clears pending requests and rotates the visit ID. Cross-tab revocation uses the existing ephemeral broadcast pattern; other tabs never inherit consent.
- Only raw `APP_ENV=local`, a canonical loopback HTTP `/capture/` URL with explicit port, and a nonsecret `local-test-…` token can enable capture. The private transport uses only `api_key`, event, random visit `distinct_id`, `schema_version: 1` and `$process_person_profile: false`; credentials and referrer are omitted, redirects error, and failures cause no retry or product error. No SDK, persistent storage, database migration, gate change or hosted target was introduced.
- Added an Analytics choice link in the avatar menu and onboarding, with a small account page explaining counted categories, excluded content/recipients, attendance/safety/identifying exclusions, and current-tab/reload limits. The choice starts off and uses native buttons and live status text. Turn off remains available while a retained choice is checking, unavailable or in error. A stale stalled check cannot prevent a later fresh opt-in after turning off.
- Coordinator's authenticated desktop review found the native buttons retained browser-default gray styling. Both Turn on and Turn off now use the existing Pals `.button` component class with equal visual prominence; the phone-width rule still gives the action a full-width target.

## Verification

- `pnpm check` passed after review fixes: format, lint, all workspace typechecks, 43 repository tests, and web/admin builds. Focused tests cover raw environment and URL rejection, complete request envelope, disabled default, cross-tab revoke, unsignaled account switch, focus/pageshow, sign-in begin/cancel, sign-out begin then focus with the old cookie still present, denial, stale response, revocation during a stalled check, reload, blocked transport and no retry/backfill. Auth-transition regression tests confirm sign-in/sign-out intent in begin messages.
- Rendered the account page at desktop and a 390px phone viewport with the local web server. The signed-out state showed the neutral unavailable message and disabled opt-in. DOM measurement showed a 358px account content width in a 390px viewport, with no horizontal overflow. The server was stopped after inspection.
- `https://usepals.com/` was inaccessible through the browser inspection tool; the recorded `docs/ux/DESIGN_DIRECTION.md`, existing components and shared light/dark tokens guided the UI.

## Limits and remaining gates

- An authenticated local browser pass for eligible initial-off/opt-in/off/reload, dark theme, and keyboard interactions was unavailable during this agent's pass: this isolated worktree has no Docker executable and `supabase status` exited with a Bun CLI crash. The coordinator subsequently reported starting the repository's existing Lima/Docker local Supabase stack and owns that authenticated rendered pass. This agent did not touch that shared stack. Browser-module tests cover the state transitions, but this does **not** count as passing the authenticated rendered acceptance gate. Coordinator review should reproduce it before accepting A or dispatching B.
- No actual hosted PostHog or live students were contacted. The synthetic sink is a test-injected `fetch` inspected in the test process, rather than an external collector. Browser-added network headers/IP are outside the controlled envelope and remain a hosted-release review item under ADR-0023.
- No disposable data fixtures were created. Nine existing product gates were not changed; no `.env.local` was created. The only owned server was stopped. The coordinator owns shared NOW/CURRENT_STATE/CHANGELOG records and main integration after exact-tip review.

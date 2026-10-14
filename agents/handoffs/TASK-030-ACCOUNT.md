# TASK-030 account editor handoff

Status: account slice implemented on `agent/TASK-030-calendar-account`; TASK-030 remains incomplete pending combined review, local Auth HTTP proof, parent gates and coordinator integration.

## Outcome

- Added owner-only `/account` through the existing ready access gate. Current Auth email and any Auth `new_email` appear separately; the page does not treat a pending address as verified.
- Added a real-name form that updates only `profiles.real_name` with the current owner ID and expected profile revision. Existing optional profile data is untouched. Stale revisions fail and preserve the draft.
- Added approved exact-domain UNC email requests and password changes through caller-session Supabase `auth.updateUser`. Email links use the fixed `APP_ORIGIN/auth/callback`. Current-password proof runs in an isolated memory-only anon client, verifies the same user ID, then rechecks live access and Auth email before the caller-session update. The proof session never replaces the cookie session.
- Added the existing provider's `reauthenticate` code request for secure password changes. Passwords and codes are omitted from result state, cleared from forms after an attempt, and not logged.

## Verification

- `node --test tests/account-input.test.mjs`: 3 passing tests covering name bounds, all five exact UNC domains and invalid subdomains, revision and password bounds.
- Scoped ESLint passed on account editor/actions/helpers/test.
- Scoped Prettier applied and `git diff --check` passed.
- Web TypeScript reached an unrelated in-progress profile worker error at `apps/web/app/profile/actions.ts:29` (FormData versus HTMLFormElement); no account diagnostics appeared.

## Remaining gates

- Disposable-local Supabase Auth and app HTTP harness must exercise email pending/confirmation, password update, wrong password, reauthentication nonce, wrong actor, gate loss, and provider-specific confirmation behavior. Local Supabase Auth health was unavailable at `127.0.0.1:54321` during this slice, so no runtime Auth claim is made.
- Parent combined build/browser QA and fresh security/design review remain. `https://usepals.com/` was inaccessible through the web inspection tool; the checked-in visual direction and design tokens guided this page.
- No hosted credentials, provider settings, schema, RLS, production data, or real user account was touched.

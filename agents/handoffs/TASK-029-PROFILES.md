# TASK-029 profile presentation handoff

Status: Profile subtask implemented on `agent/TASK-029-reference-screens`; coordinator review and rendered QA remain. Baseline `4f0967dcdab234c06f80ca2f849667a6a43ce6fb` includes the exact reviewed P2 dependency.

## Outcome

- Reworked the owner and peer profiles to follow the supplied screenshots: centered circular portrait with neutral fallback, centered name and compact UNC email badge, icon facts, a two-column wide photo gallery, interests before plain prompt rows, and a local Back/options row under the shared app header.
- Owner Edit profile sits in the top action row. Main and gallery photo edit affordances lead to the existing photo controls; saved images retain the existing View/Edit dialog and focus handling. Empty profile fields remain empty or offer an owner action. No sample person or answers were inserted.
- Peer photos remain view-only and use the current authorized rich detail/photo gateway. `Add Pal` is an optional presentation label on the existing friendship control. Its accepted, incoming, outgoing, unavailable and uncertain behavior was not changed. Message focuses the existing first-message composer when no thread exists and links to the existing accepted/pending thread otherwise. Safe Hangout return routes show the correct Back label.
- Loading states now use neutral portrait and gallery shapes.

## Checks

- `pnpm --filter @pals/web typecheck`: passed.
- Focused ESLint on changed TSX: passed.
- Prettier on changed profile/peer files: passed.
- `git diff --check`: passed.
- Source check: no auth, RPC, storage gateway, schema, or DM request flow changed. Peer rich fields are still guarded by `richDetail`; the existing page/auth transition clearing and photo-error clearing remain.

## Reviewer corrections

- Restored a visually hidden heading so the owner prompts section's `aria-labelledby` resolves to a real element.
- The peer profile now replaces an existing People `focus` value with `URLSearchParams.set` when returning to the current peer. This preserves validated People filters, produces one focus parameter, and leaves saved Hangout return paths unchanged.
- Focused return regression test: `node --test tests/people-profile-return.test.mjs` passed (2 tests). Direct local `tsc --noEmit -p apps/web/tsconfig.json`, focused ESLint, Prettier and `git diff --check` passed. The pnpm wrapper attempted a workspace reinstall and declined without a TTY, so direct installed binaries were used for these follow-up checks.

## Browser QA refinements

- Profile friendship presentation now hides verbose known-empty status visually while retaining its live screen-reader status. Pending and accepted states show their actual state beside the actions; unknown/error states remain visible. The existing transitions and messages are unchanged. `Add Pal` and new-message actions use Phosphor icons.
- Facts display `Class: 2028` without repetition and normalize only the known UNC Chapel Hill school spellings. No academic year is inferred.
- The owner portrait pencil and empty portrait Add button focus the existing primary file input through the same helper used by dialog Edit photo. The existing upload validation/save path remains intact.
- Direct installed web TypeScript check, focused ESLint, Prettier, and `git diff --check` passed. Coordinator owns final rendered retest and build.

## Coordinator review and remaining gates

- Render owner and peer at 320, 390, tablet, and 1280 px with real authorized local fixtures; inspect portrait cropping, gallery ratio, long names, button placement, and keyboard/focus behavior. The worker did not start a fixture runtime or claim screenshot QA.
- Check actual owner photo controls, draft/conflict/save states and peer friendship/DM states in the disposable runtime, including blocked/denied/empty states.
- Review the combined task diff with shared header and Hangout changes. Runtime/publication/main integration remain coordinator-owned and TASK-027 staged acceptance remains a dependency.
- Live `usepals.com` direct web fetch was unavailable to this worker; the supplied screenshots and previously inspected project design direction governed the profile presentation. Coordinator inspected the live site in the app browser.

## Scope

Owned changes: `apps/web/app/profile/{editor.tsx,profile-summary.tsx,profile.css,profile-topbar.tsx,loading.tsx}`, `apps/web/app/people/[id]/{person-view.tsx,loading.tsx}`, optional label prop in `apps/web/app/people/friend-control.tsx`, and this handoff. No shared header, token, task queue, schema, provider, or Hangout file was modified by this worker.

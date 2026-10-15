# TASK-032 Stage P2 handoff: extra photos and profile fields

Status: source implementation ready for coordinator review; no P2 commit or publication. Branch `agent/TASK-032-interaction-photos`, current shared HEAD `2c86ca8bb01774ab06e139090d9fafba86a2a1e8` (the coordinator advanced shared HEAD during P2 work). P2 changes remain unstaged. Coordinator owns fixture/browser QA, review, task publication, and integration.

## Outcome

- Reused the P1 crop modal for a square primary or 9:5 extra photo. The direct gallery empty slot accepts a click or local file drop, and existing photo options expose View, Replace, Reposition, and Delete. The selected extra photo stays local until explicit Save; Cancel leaves the saved photo intact. The modal continues to use P1 generation/auth/hidden/late-action checks, including the guard after asynchronous canvas export. A byte-level browser image header probe rejects over-20 MP first selections before image decode; server Sharp remains authoritative for framing, format, normalization, output bounds, and the single WebP encode.
- Added up to four sequential extra-photo slots and adjacent Move left/right controls for touch/keyboard. Desktop drag order uses the same owner action. `reorderPhotos` accepts only a permutation of the exact current owned extra-photo paths at the expected profile revision, with no Storage operation. Gallery positions and option actions bind the current slot and revision; crop and pending actions block reorder, and stale changes require an authoritative refresh. Add/replace/remove still use existing owner `changePhoto` upload, CAS and guarded detached cleanup. Local and cross-tab invalidation carries no photo, path or identity payload.
- Real name is now editable with the other profile basics. `saveProfile` applies the existing Account 100-character name validator through the owner-bound profile revision CAS and revalidates Profile, Account, and Hangouts. Existing Account name editing remains intact. School and email remain read-only. Other profile field validators, optional limits, bio sentence rule, Instagram handle rule, and saved draft on errors remain in place.
- Existing layout, color/type tokens, P1 mobile crop controls and privacy route are retained. Gallery images keep the current 1.8 ratio. When a successful upload awaits authoritative profile refresh, the slot shows an updating state with a Reload option rather than exposing an unverified path.

## Files owned

`apps/web/app/profile/editor.tsx`, `apps/web/app/profile/primary-photo-editor.tsx`, `apps/web/app/profile/actions.ts`, `apps/web/app/profile/profile.css`, `apps/web/lib/owner-photo-order.ts` (new), `tests/owner-photo-order.test.mjs` (new), `agents/handoffs/TASK-032P2.md` (new).

## Checks

- ESLint on changed TypeScript and helper: pass.
- `tsc --noEmit -p apps/web/tsconfig.json`: pass.
- Focused Node tests (owner photo normalization, onboarding/profile validation, Account input, new reorder permutation): 15/15 pass.
- `next build --webpack` from `apps/web`: pass after the final helper and invalidation edits. Default Turbopack is blocked by the inherited external root `node_modules` symlink, as P1 recorded.
- No P2 authenticated browser, Storage/CAS, second-actor, touch-device or fresh-session persistence claim is made by this worker. Coordinator owns the disposable local fake actors and private fixtures. `https://usepals.com/` was attempted through the available web viewer but inaccessible; existing design direction and P1 visual plan governed the targeted preservation work.

## Review focus

Run owner add/replace/reposition/delete/reorder through the real local Storage/CAS path, including failed and concurrent saves, another-actor denied mutation, refresh and fresh Auth session. Inspect 319×720 and desktop gallery/crop states. Check keyboard focus return and drop behavior, especially four-photo/full and zero-photo states. Verify name save, conflict draft retention, Account compatibility and unchanged school/email. The coordinator should review the exact P2 files above before staging or committing.

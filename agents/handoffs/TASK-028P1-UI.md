# TASK-028P1 UI handoff — hometown and owner photo controls

Status: UI source complete for independent review; parent task remains active. Branch `agent/TASK-028P1-profile-corrections`.

## Outcome

- Saved primary and extra owner photos open an accessible native dialog with View photo and Edit photo. View displays the existing private owner photo URL at a larger contained size. Close, Escape and backdrop dismissal return focus to the originating image. Entering View focuses Close; Edit opens and focuses the matching existing slot's file input. The existing photo upload/remove forms, revision value, validation and server action remain unchanged. Photo errors retain their reload affordance.
- The owner editor now loads the optional `hometown` value into the same draft/save/cancel and revision flow as other text. The input enforces 100 Unicode code points without the browser's UTF-16 `maxLength` mismatch. Empty text clears through reviewed DATA normalization. The shared summary renders a Phosphor map pin and `From {hometown}` between the name and bio only when a hometown exists. The peer caller has no hometown source field under current authorization, so no new peer disclosure was added.
- All content comes from each account's saved `OwnerProfile`; no fixture identity or inferred location was added.

## Evidence

- `pnpm --filter @pals/web exec tsc --noEmit`: passed after photo and hometown changes.
- Targeted ESLint for `editor.tsx` and `profile-summary.tsx`: passed.
- `git diff --check`: passed; Prettier applied to owned files.
- Independent photo source review found and the UI lane corrected the View focus gap in `4d75f8e`; source review of the final hometown wiring and browser QA remain coordinator gates.

## Remaining gates

- Coordinator will verify the rendered owner profile at mobile/tablet/desktop widths and exercise photo dialog, exact-slot edit, hometown save/clear/Unicode boundary and stale-save behavior in the named disposable environment. The reviewed DATA migration must be applied there before those live checks.
- Coordinator owns shared design QA/docs, full build/security review, branch publication, main integration and remote SHA verification. This lane did not push or use a hosted environment.

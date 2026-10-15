# TASK-032P3 profile feedback correction handoff

Status: source candidate for review; parent TASK-032 remains incomplete. Branch `agent/TASK-032-interaction-photos`, based on `87d56faed84639ad88be144a78468310863c2a3e` before this commit.

## Outcome

- Removed the visible Move left/right rows beneath gallery photos. Desktop drag still calls the existing revision-CAS reorder action. Each extra photo's existing options dialog now has a native Photo position selector for touch and keyboard ordering. It checks the selected revision/path, closes before submitting, and returns focus to Edit photos. The existing `validPhotoOrder` rule is unchanged.
- Removed the owner More about you display. Saved fields and the Edit profile form remain. Removed the duplicate Photo controls panel and its refs. Edit photos scrolls to and focuses the first gallery control. Photo action feedback remains in the gallery; cleanup retry appears there only when cleanup is needed. Privacy and footer links remain in their existing locations.
- Shared owner/peer ProfileSummary displays a UNC school mark beside the name only when its existing `verified` condition is true and the campus matches recognized UNC Chapel Hill strings. Other campuses show no logo. The school fact stays visible and this mark makes no separate enrollment claim.

## Asset provenance

`apps/web/public/brand/schools/unc-chapel-hill.png` is an unchanged copy of the official transparent 768×601 Interlocking NC PNG supplied by the coordinator from [UNC identity's Interlocking NC page](https://identity.unc.edu/brand/interlocking-nc/). Source and copied SHA-256: `b00d8c8093831d4b8685f53999336da7f4145980a3e26ced023af42832d1fd77`. It is locally served without image optimization, filters, shadow or cropping; CSS retains aspect ratio and clear space.

## Verification

- Scoped ESLint for `editor.tsx` and `profile-summary.tsx`: pass.
- Web TypeScript `tsc --noEmit -p apps/web/tsconfig.json`: pass.
- Existing `tests/owner-photo-order.test.mjs`: 1 pass.
- Prettier on scoped files and `git diff --check`: pass.
- Source review: no action/backend/schema/permission change; existing owner form fields, privacy link, footer utilities and CAS reorder path remain.

Rendered owner/peer, touch selector, focus and logo checks are assigned to coordinator runtime QA and have not been claimed here. No hosted or backend operation was performed. The dependency wrapper attempted to repair a cross-worktree `node_modules` symlink, so checks used installed executables directly. Review, task branch push, shared main records, parent acceptance, sign-off and deployment gates remain with the coordinator.

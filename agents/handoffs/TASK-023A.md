# TASK-023A — shared student shell and design foundation handoff

Status: Implementation on `agent/TASK-023A-student-shell` is ready for independent exact-tip design/security review. TASK-023B and canonical integration remain coordinator-owned. Baseline: published main `373366ef128b9af85860969f6ccc30760c4a054b`.

## Delivered

- Refined semantic student light/dark tokens in `packages/design-tokens/tokens.css` while retaining every preexisting token name, meaning and Mapbox pin contrast. No font, provider or framework changed.
- Added one reusable student header and five-destination navigation. The header keeps the `/safety` entry for every signed-in account, including active unready verification/onboarding users. Profile photo/link appear only on ready surfaces. Disabled destinations in the mock shell still open its existing informative dialog; saved routes display gated destinations as unavailable rather than linking into a disabled feature.
- Reused the shell on `/`, sign-in, signup, verify, onboarding, restricted, mock Hangouts, saved map/detail, create and owned/edit routes. Public entry now describes the local build truthfully. New/owned copy describes the existing saved map and separately gated chat accurately.
- Aligned page, form, action, map, rail, panel and status styling around the shared tokens. The saved map and saved detail each now have one `<main id="main">` and one skip target, removing the nested duplicate landmark.
- Kept the live reference's rounded Nunito character, clear blue welcome surface and map-led discovery. The app retains its Hangouts terminology and accepted five navigation destinations.

## Reference and verification

Live `https://usepals.com/` was inspected on 2026-09-23/24: white background, pale blue rounded hero, heavy rounded heading, central Pals mark, rounded map frame and activity strip. The live site's `Explore`, `My activities`, `Memories` and `Create an event` labels were treated as visual reference only.

- Prettier check, ESLint, web type generation/TypeScript, all 37 unit tests, web production build and admin production build passed. The dependency tree was copied from the reviewed TASK-016C local worktree because this isolated worktree's package install could not resolve the registry; package and lock files did not change.
- Static built HTML for `/`, `/signin`, `/signup` has exactly one main, one `id="main"` and one skip link. Source inspection confirms saved map/detail now use the Frame main only.
- Contrast calculations: white on light blue feature surface 5.5:1, white on dark feature surface 6.9:1, light accent on white 7.04:1, dark accent on raised dark surface 8.73:1.
- Coordinator rendered `/` at 1280 and phone 390; `/signin` at tablet 820; `/signup` at 1280, phone 390 and narrow 320. These had readable fields and controls, one main, and no document overflow (signup scroll width equaled 390/320 viewport). Signed-out `/hangouts` showed a neutral unavailable/error page without protected content at phone width. Admin shell rendered at 1280 with shared tokens and no student data/actions.
- A task-owned read-only proxy on port 3132 activated the shipped dark media rule for browser inspection, without changing shipped CSS, OS settings or app configuration. Coordinator rendered `/` at 390 with dark canvas `#122532`, ink `#f0f7fc`, readable blue hero and scroll width equal to the viewport. `/signup` at dark 390 and 1280 had readable labels, help, inputs, action and links; keyboard Tab revealed the visible skip link. This is forced CSS-rule rendering, not OS dark-mode emulation.

## Boundaries and remaining evidence

No `supabase/`, `apps/web/lib/`, server action, API route, feature gate, schema, RLS, permission, backend configuration or hosted change is in this diff. Local services were stopped and all seven gates were false at baseline. Auth requires the exact local origin `http://127.0.0.1:3000`; that port belongs another checkout and was not touched. Therefore authenticated mock/saved Hangouts, create/owned, onboarding/restricted, gate-on, dynamic loading/empty/error/denied and join/safety states were not rendered in this task checkout. Existing action behavior is covered only by unchanged source and the 37 passing unit tests; no claim of end-to-end authenticated flow verification is made. Coordinator should assess this evidence gap before accepting A and integrate only after exact-tip review.

No TASK-010 host/co-host ownership or TASK-023B route-specific adoption was started. Coordinator owns shared NOW/BACKLOG/CURRENT_STATE/CHANGELOG records.

Code commit: `5dfbb05e36e4151a4a7c58a074de680e44098922`. Final handoff commit and remote branch SHA are reported to the coordinator after publication.

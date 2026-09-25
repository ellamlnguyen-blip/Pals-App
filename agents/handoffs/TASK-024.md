# TASK-024 brand correction handoff

Status: implementation ready for independent design/security review; canonical integration pending.

## Scope and visual outcome

- Started from `origin/main` `388ec4d763e7914cc75b377a880abbe360551396`; expected baseline `ac172980d4516ce54d3804c30393b225c0f5ea2c` was verified as an ancestor. TASK-017 and TASK-010 are complete locally on this baseline. TASK-021's hosted rehearsal and policy gates remain separate.
- Exact supplied source: `apps/web/public/brand/pals-logo.png` (1312 × 1199 RGBA). The file was not edited. Its transparent background works directly on white; no derivative was needed. `BrandLink` uses it in the public/authenticated header and root loading/error states; the shared header covers sign-in, sign-up, onboarding and student routes. Failed profile photos now show an initial instead of a broken image.
- Shared tokens: Carolina blue `#7BAFD4` (`--pals-brand`, feature surface), white `#FFFFFF` canvas/raised surfaces, pale `#EAF5FB` quiet surface, ink `#16334B`, accessible action text `#245B80`, error `#A22832`, success `#23654A`, warning `#80540C`. Light mode is explicit. The map uses the light Mapbox style regardless of OS preference; the map and its data/controls otherwise retain their contracts.
- Existing Nunito type, radius scale, routes, five accepted navigation labels and map/list relationship are retained. Shared tokens and shell primitives carry the correction rather than per-route color overrides. No new backend behavior or mock product action was added.

## Verification evidence

- Final `pnpm check` after removing the temporary preview: formatting, lint, types, 48/49 Node tests (one existing loopback-dependent sandbox skip), and web/admin production builds passed. The final production route list contains no preview route.
- Live `https://usepals.com/` was inspected on 2026-09-25. Before this change, current main used a text-only `Pals` header and dark `#386D99` feature surface with `#F8FBFD` canvas; after, the actual source logo appears in the shared header and the rendered home has white chrome and a `#7BAFD4` welcome panel with dark readable text. The retained public heading, action and UNC messaging are visible in the browser.
- Rendered `/`, `/signin`, `/signup` and root loading/error states in the local web app. Home at 1280, 390 and 320 pixels; sign-in at 820 and 390; sign-up at 320; error/loading at 320. No horizontal page overflow was measured. A temporary unpublished Hangouts preview using the real `StudentHeader` and `HangoutsShell` was rendered at 1280, 820, 390 and 320. It had one main landmark, no horizontal page overflow, five navigation targets with horizontal scroll at 320, map/list stacking, honest missing-map-token treatment, filter selection, preview heading focus and focus return on close. The preview route was removed before final source verification.
- Contrast calculations: ink on Carolina blue 5.55:1; ink on white 13.05:1; dark blue links on white 7.28:1; muted text on white 6.28:1; error on white 7.28:1. White text on Carolina blue would be 2.35:1, so primary buttons and the feature panel use dark ink. Dark accent surfaces, including map selections and admin controls, keep white text via the separate `--pals-button-ink` token.
- `git diff` is confined to student presentation TSX/CSS, shared tokens, this design plan and handoff. `apps/web/lib`, API routes, server actions, validation, feature gates, `supabase/`, migrations and RLS were untouched. The original logo file is untouched.

## Limits and follow-up

The disposable checkout has no local Supabase configuration or Docker runtime. Authenticated Hangout creation/editing/joining, Calendar, People/friendship, Chats/DMs, Notifications, Safety and their denied/gate-off/uncertain state transitions could not be exercised as live routed flows here. Opening `/hangouts` without a local publishable key rendered the existing error boundary, which was checked at 320 pixels. Existing logic tests and the presentation-only diff are the available regression evidence; a local-service authenticated route pass is still required before claiming full TASK-024 acceptance.

Independent final design/security review: pending. Task branch remote SHA: pending. Integrated `origin/main` SHA: pending.

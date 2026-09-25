# TASK-024 brand and interaction plan

Baseline: `origin/main` `388ec4d763e7914cc75b377a880abbe360551396` (expected `ac172980d4516ce54d3804c30393b225c0f5ea2c` is an ancestor). The supplied transparent RGBA logo is `apps/web/public/brand/pals-logo.png`; its source pixels remain unchanged. The current usepals.com page was inspected on 2026-09-25: white chrome, blue Pals mark, Carolina-blue welcome panel and campus map.

Reading this as a student coordination app for verified UNC students, with bright, friendly Carolina blue and white styling. Use the existing Nunito family and native CSS. Design variance 5, motion 2, density 4: clear hierarchy and map-first utility matter more than decoration.

- **Color:** white canvas and raised surfaces; exact Carolina blue `#7BAFD4` for brand panels and primary buttons; pale blue `#EAF5FB` for quiet surfaces; ink `#16334B` and actionable dark blue `#245B80` for readable text. Success, warning and error have separate semantic colors only. Keep controls and map pins readable over the light map.
- **Logo:** use the source image at natural proportions in the shared header on public and student routes, including sign-in, sign-up and onboarding. The image has transparent pixels and needs no derivative. Give the home link an accessible name and the image useful alt text.
- **Type and shape:** retain Nunito, strong rounded headings, 1.5rem major surfaces, 1.25rem panels, 0.75rem fields and pill primary actions. Use existing shared spacing and limit shadows to raised surfaces.
- **Navigation:** retain Hangouts, Calendar, People, Chats and Notifications. On narrow widths, the navigation scrolls horizontally with full-size targets; the account and safety actions remain reachable. Keep map/list order and the existing mock versus saved distinction.
- **States:** loading, empty, error, denied, gate-off and uncertain actions keep their existing wording and behavior. Apply white/blue surfaces, dark text and visible focus rings. Honor reduced motion. Keep the interface light even when the operating system prefers dark colors.

This is a presentation-only change. Route, server action, API, validation, gate, database, RLS, privacy and safety contracts are unchanged.

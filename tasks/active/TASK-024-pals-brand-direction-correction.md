# TASK-024 — Pals brand and visual direction correction
Status: Planned
Date: 2026-09-24
Relationship: Follow-up to completed TASK-023; execute as the next student-web visual correction when the current TASK-017 work is clear

## Goal
Correct the student-facing Pals website so its visual identity is unmistakably Carolina light blue and white, uses the supplied Pals logo consistently, and feels like a cohesive branded product instead of a generic frontend theme.

## Prompt for the implementation agent

> Redesign the Pals student web frontend around the supplied Pals logo and a Carolina light blue and white brand system. Use the exact source asset at `apps/web/public/brand/pals-logo.png` as the official Pals logo. Do not redraw, replace, stylize, recolor, distort, crop away, or substitute the mark with a text-only “Pals” wordmark. Use the logo consistently in the public header, authenticated student header/navigation, sign-in, sign-up, onboarding, empty states where appropriate, and other brand touchpoints. Preserve its proportions and provide accessible sizing and alternative text. If the source image’s dark background does not sit cleanly on the white interface, create a transparent presentation derivative without changing the original source asset or logo geometry.
>
> Make Carolina light blue the primary brand color, using UNC Carolina blue `#7BAFD4` as the anchor value, with white `#FFFFFF` as the dominant canvas and surface color. Build a restrained supporting palette only for readability and state communication: dark blue/ink for text, a lighter Carolina-blue tint for panels, and accessible success, warning, and error colors. Do not introduce purple, neon gradients, orange, green brand accents, dark-first styling, or unrelated theme colors. Audit text, buttons, links, focus rings, map controls, badges, navigation, forms, dialogs, loading states, empty states, error states, and denied states for contrast and consistent use of the palette.
>
> Make the interface feel bright, friendly, campus-based, and approachable: generous white space, rounded but disciplined surfaces, clear hierarchy, confident headings, and tactile primary actions. Use the supplied logo as the source of brand personality; do not rely on decorative gradients, generic glassmorphism, arbitrary illustrations, emoji, or a new visual language that competes with the mark. Keep the accepted Pals navigation and terminology: Hangouts, Calendar, People, Chats, and Notifications. Keep map-first discovery and make the map/list relationship clear on desktop, tablet, and phone.
>
> Treat the existing backend as authoritative. Do not change database schemas or migrations, Supabase Auth, RLS, server actions, API routes, payloads, validation, feature gates, privacy rules, safety rules, or authorization behavior. Do not add mock product behavior to make the redesign look complete. Use the existing data and actions exactly as they are. If the UI needs information or behavior the backend does not provide, keep the existing honest state and document a separate follow-up rather than changing the backend.
>
> Before coding, inspect the current production-build routes, shared tokens/components, the supplied logo, the accepted MVP/UX/safety specifications, the installed `design-taste-frontend` skill, and the current usepals.com reference. Write a short brand and interaction plan with color tokens, logo usage, typography, surface/radius rules, responsive navigation, and state treatment. Then update shared tokens and reusable student components first, followed by the existing public/authenticated routes. Do not make isolated page-only color patches.
>
> Verify the final result at desktop, tablet, 390px phone, and 320px narrow widths. Check light mode, keyboard focus, reduced motion, no horizontal overflow, loading, empty, error, denied, gate-off, and uncertain-action states. Re-run the existing critical flows for sign-in/onboarding, profile editing, Hangout creation/editing/discovery/joining, Calendar, People/friendship, Chats/DMs, Notifications, and Safety. Review the final diff and prove that backend files, migrations, RLS, server actions, API contracts, gates, and authorization behavior did not change.

## Why this is separate from TASK-023
TASK-023 introduced a shared shell and route adoption, but the current result does not make the Carolina-blue-and-white Pals identity and supplied logo explicit enough. This follow-up is a brand correction, not permission to redesign backend behavior or add new product features.

## Required context
- `AGENTS.md`, `docs/product/MVP.md`, `docs/product/PRINCIPLES.md`, `docs/ux/DESIGN_DIRECTION.md`, and `docs/ux/TASK-023-DESIGN-PLAN.md`.
- The installed `design-taste-frontend` skill.
- Current `origin/main`, existing student routes, shared design tokens/components, and accepted backend/security contracts.
- Supplied logo source: `apps/web/public/brand/pals-logo.png`.

## Out of scope
- Any schema, migration, Supabase, RLS, authorization, server-action, API, validation, feature-gate, privacy, safety, or hosted change.
- New product features or changes to accepted navigation and terminology.
- Admin redesign, mobile-native app work, production deployment, or domain cutover.

## Acceptance criteria
- [ ] Carolina blue `#7BAFD4` and white are the unmistakable primary brand system, with accessible supporting colors only.
- [ ] The supplied logo asset is used consistently and remains unmodified as the source asset.
- [ ] Shared tokens/components, not isolated patches, drive the visual correction across all student routes.
- [ ] Existing backend behavior and critical flows are unchanged and verified.
- [ ] Desktop/tablet/phone/narrow, light-mode, keyboard, and state coverage is recorded in the handoff.
- [ ] Final independent design/security review confirms no backend or authorization scope expansion; task and `main` remote SHAs are recorded.

## Handoff
Record the exact logo file used, final color tokens, routes changed, before/after visual evidence, contrast checks, responsive/state coverage, backend files confirmed untouched, limitations, tests, task SHA, and integrated `main` SHA.

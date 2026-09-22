# Pals design direction

Source: user build instructions and direct inspection of https://usepals.com/ on 2026-09-21.

The live reference has a bright white canvas, soft campus-blue accent, generous rounded surfaces, chunky friendly headline typography, and casual social copy. A campus map follows the introductory area, with activity filters and familiar zoom controls. Preserve its welcoming, lightweight character while designing the new map-first application.

The reference is visual evidence, not product authority. Its current Memories navigation and “Create an event” wording do not override the accepted Pals navigation or Hangout terminology. Use Hangouts, Calendar, People, Chats, Notifications; access profile/settings through the avatar.

## Shared implementation direction
Maintain visual constants in `packages/design-tokens/`. Bootstrap establishes provisional primitives only; later UI tasks refine them coherently. Prefer approachable typography, clear hierarchy, systematic spacing, accessible contrast and focus, and responsive map overlays. Avoid enterprise dashboard styling and social popularity mechanics.

## Required frontend workflow
Read the installed Leon Taste skill (`design-taste-frontend`), relevant task and UX specifications, existing tokens/components, and inspect the current live reference before substantial UI work. Product behavior, accessibility, safety and mobile usability take priority over generic skill rules. Plan desktop/tablet/mobile behavior before coding; inspect rendered desktop/mobile states and record findings in the handoff.

## Map shell (TASK-004)
The map utility keeps a compact heading and primary create action, rounded map frame, blue/white numbered pins, and a narrow preview/example rail at 900px and above. Smaller viewports stack the preview below the map; phone controls wrap without horizontal overflow. The mock-data notice stays above the map and every preview repeats its status. Keyboard users can select native button pins/clusters or the matching example list. Preview focus moves to its heading and returns on close; native modal shells restore their trigger. Shared marker contrast and overlay layering live in design tokens.

Mapbox's marker constructor assigns `role=img`, so restore `role=button` after construction. Scope the map container positioning more specifically than `.mapboxgl-map` to prevent its stylesheet from collapsing the container. These were found during real offline-renderer testing, not inferred from types. See `TASK-004-INTERACTION-PLAN.md` and the handoff for evidence and live-token limitations.

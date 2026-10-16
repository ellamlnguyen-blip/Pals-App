# Pals design direction

## Chats reference layout amendment 2026-10-16

TASK-036 uses the user-supplied Chats image as a visual reference for a rounded conversation shell: a compact combined sidebar, a prominent selected row, and a right thread pane with a Hangout detail strip and compact composer. On phones, the list and thread occupy separate routes with a back link. The existing icon header and unified conversation ordering follow later explicit user requests. Render only authorized names, avatars, messages and Hangout details; never copy the image's sample social data into the application. See `tasks/active/TASK-036-chat-reference-layout.md` and `agents/handoffs/TASK-036-UI.md` for scope and local evidence.

## Hangouts map amendment 2026-10-14

TASK-031 local candidate uses a compact Hangouts/campus/Create row and large rounded Mapbox map with activity emoji pins, independent Today/Tomorrow/This week/Later checkboxes and an authorized public hover/focus/tap View/Join preview. The alternate list is below the map. This replaces the historical numbered-pin/persistent-rail presentation for saved discovery. Four-bit masks filter before the101-row probe with the original seven-argument RPC, projection, epoch/revalidation, grants and ranking unchanged; legacy upcoming/all remain compatible. Periods are disjoint upcoming starts in America/New_York, with Tomorrow taking precedence at the week boundary. No private instructions or GPS are stored in browse memory. Current behavior, evidence and unfinished responsive/lifecycle/staging acceptance are in `TASK-031-MAP-QA.md` (under docs/ux); historical sections below retain their original task scope.


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

# TASK-004 interaction and visual plan

Prepared before implementation, 2026-09-22. Sources: task contract, accepted product/UX/map/privacy ADRs, Leon Taste, existing shared tokens, and direct live usepals.com browser inspection.

## Direction
Friendly campus-blue, white canvas, self-hosted Nunito, rounded surfaces; native CSS extends the existing system. Taste dials: variance 3, motion 2, density 4. Marketing imagery, hero patterns and animation prescriptions do not apply to this map utility. Mapbox is the actual map, never an illustrated substitute.

## Structure and responsive behavior
Hangouts is the first, active primary navigation item. Calendar, People, Chats and Notifications are explicitly unavailable shells, not working destinations. Profile identity and signout stay in the header. Short heading with persistent + Create Hangout action precedes filters and a clearly labeled mock-data notice.

Desktop: dominant map with a narrow example/preview rail. Tablet: same structure where space permits, then stack at 900px. Phone: compact wrapping navigation, full-width creation action, filters wrap, map above the preview/examples. No overlay blocks attribution or map controls. Map reserves height while loading. 44px minimum interactive targets. Existing light/dark tokens govern app surfaces; use corresponding Mapbox light/dark basemaps.

## Interactions
Map opens around UNC Chapel Hill; pan, zoom, reset-to-campus and explicit one-shot locate action. HTML button pins/clusters support keyboard activation; clusters expand to their source's expansion zoom, then focus returns to the map. Selecting a pin or accessible example list item opens the same preview and moves focus to its heading. Closing restores focus to the invoking control if present, otherwise the example list. Escape closes the preview. Selection styling connects pin, list and preview.

Category and example-time filters affect local fixtures only, with clear reset and empty state. No ranking, visible-region backend or fabricated live feed. Fixture coordinates are approximate public campus places; fixtures carry no people, identities, private addresses or exact meeting details.

Create opens a native modal with a short explanation: creation is not available, nothing is saved or published. No fake publish button. Escape/close returns focus to the create trigger. Future navigation shells explain their unavailable status.

## Failure and privacy states
Missing/non-public token: reserved map area explains configuration is needed; examples and preview remain usable. Loading: static reserved map area with status. Map/tiles failure or timeout: clear retry, keep examples usable. Empty filter: no examples match, reset filters. Location denial/unavailable/timeout: nonblocking status, map still browsable. No permission request on mount, no watchPosition, no localStorage, server coordinate submission, analytics or user-location marker. Successful one-shot location only orients the local map, with coarse rounding and an outside-campus fallback. Cleanup removes map/listeners/markers and ignores callbacks after unmount.

## Verification plan
Repository checks; focused fixture/privacy and gate assertions; rendered 1280px desktop, 768px tablet and 390/320px phone; map pin/cluster/zoom/pan; keyboard/focus; modal no-publish; filter-empty/reset; no-token/loading/error/retry; denied location; anonymous/live gate regression. Record live-token or environment limitations honestly. Independent reviewer after implementation when practical.

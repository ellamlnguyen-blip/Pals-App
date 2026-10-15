# Location and Maps

## Place-first creation and pin interaction amendment 2026-10-14

TASK-032 candidate retains marker DOM across matching source updates, tracks pointer over trigger/card plus focus and delays dismissal for travel. Selection uses independent CSS scale1.08, preserving Mapbox positioning transform and ordinary shadow; keyboard focus stays visible. New creation uses existing PublicAreaPicker and approximate3-decimal public coordinates/UNC bounds before details. Existing edit flow and caller-bound final validation/idempotency remain unchanged. No geocoder/provider/schema/GPS or public/private location boundary change. Final local evidence and incomplete fallback/device/release gates are in `docs/ux/TASK-032-INTERACTION-PHOTO-QA.md`.

## Hangouts map amendment 2026-10-14

TASK-031 local candidate uses a compact Hangouts/campus/Create row and large rounded Mapbox map with activity emoji pins, independent Today/Tomorrow/This week/Later checkboxes and an authorized public hover/focus/tap View/Join preview. The alternate list is below the map. This replaces the historical numbered-pin/persistent-rail presentation for saved discovery. Four-bit masks filter before the101-row probe with the original seven-argument RPC, projection, epoch/revalidation, grants and ranking unchanged; legacy upcoming/all remain compatible. Periods are disjoint upcoming starts in America/New_York, with Tomorrow taking precedence at the week boundary. No private instructions or GPS are stored in browse memory. Current behavior, evidence and unfinished responsive/lifecycle/staging acceptance are in `TASK-031-MAP-QA.md` (under docs/ux); historical sections below retain their original task scope.


## Initial-release scope amendment — 2026-09-26

[Accepted ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) narrows the initial UNC release only. Friend-attendance context and friend-aware ranking below are post-launch scope. Initial saved map retains original authorized start-time/ID order before the 101-row probe/100-result limit and fresh revalidation. Calendar remains chronological. The independent ADR-0024 safeguard gate stays off. Approximate public place and participant-only private instructions remain required; no people tracking or hidden-member ranking input.

## Intent
The map is a playful visualization of campus social activity, not live people tracking.

## Provider
Mapbox.

## Hangout Geography
Store public lat/lng, display place, campus zone, precision level, optional private exact details.

For residences/sensitive places, public pin may be generalized/offset and exact instructions gated to participants.

## User Location
Optional device location may center map, support near-me, and rank nearby hangouts. Do not persist continuous live location or expose user coordinates to other users.

## Map UX
Pan/zoom; current location; pins; clustering; visible-region queries; filters; preview/detail; friend-attendance context; create action.

## Ranking Signals
Time relevance, distance, friend attendance, interest relevance and freshness. Large-event dampening is deferred from initial MVP under the accepted ADR-0024 amendment (2026-09-26); its gate stays off and the current saved-map start-time/ID order is preserved. Never popularity alone.

## TASK-020A disposable-local saved discovery

The default-off private large-Hangout gate leaves saved discovery in start-time/ID order. While enabled, `public.query_saved_hangouts` filters and authorizes the same campus viewport first, then places Hangouts with fewer than 25 **viewer-visible, ready, joined** roster members ahead of the others. Start time and ID break ties; the database applies the 101-row probe after this order. The RPC returns only the ten existing `SavedPin` fields, an opaque gate epoch and `ranking_mode` (`chronological` or `small_first`). It does not return a size, class or attendee identity. The separate host-size RPC counts all currently joined rows, including a nonready member, and is unavailable when the gate or host authority is absent.

The RPC arguments are `p_west`, `p_south`, `p_east`, `p_north`, `p_time_filter` (`upcoming|all`), `p_joining_filter` (`any|open`) and `p_cutoff` (ISO timestamp). Its JSON response is `{ pins: SavedPin[], epoch: string, ranking_mode: "chronological" | "small_first" }`. The Stage B saved-map adapter must capture one cutoff and reuse identical bounds, filters and cutoff for both RPC calls: first projection, fresh `get_access_state`, second projection. It releases only the first 100 rows after comparing the complete ordered 101-row arrays, ranking mode and epoch. Any denied, failed, timed-out or mismatched step discards all prior rows; there is no fallback to a less authorized reader. The cutoff must be within two minutes of database time on each call. Calendar ordering and source-table RLS remain unchanged. This local backend does not enable the gate, install an operator signal reader or authorize hosted use.

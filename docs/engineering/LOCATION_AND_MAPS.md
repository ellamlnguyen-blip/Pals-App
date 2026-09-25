# Location and Maps

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
Time relevance, distance, friend attendance, interest relevance, freshness, and large-event dampening. Never popularity alone.

## TASK-020A disposable-local saved discovery

The default-off private large-Hangout gate leaves saved discovery in start-time/ID order. While enabled, `public.query_saved_hangouts` filters and authorizes the same campus viewport first, then places Hangouts with fewer than 25 **viewer-visible, ready, joined** roster members ahead of the others. Start time and ID break ties; the database applies the 101-row probe after this order. The RPC returns only the ten existing `SavedPin` fields, an opaque gate epoch and `ranking_mode` (`chronological` or `small_first`). It does not return a size, class or attendee identity. The separate host-size RPC counts all currently joined rows, including a nonready member, and is unavailable when the gate or host authority is absent.

The RPC arguments are `p_west`, `p_south`, `p_east`, `p_north`, `p_time_filter` (`upcoming|all`), `p_joining_filter` (`any|open`) and `p_cutoff` (ISO timestamp). Its JSON response is `{ pins: SavedPin[], epoch: string, ranking_mode: "chronological" | "small_first" }`. The Stage B saved-map adapter must capture one cutoff and reuse identical bounds, filters and cutoff for both RPC calls: first projection, fresh `get_access_state`, second projection. It releases only the first 100 rows after comparing the complete ordered 101-row arrays, ranking mode and epoch. Any denied, failed, timed-out or mismatched step discards all prior rows; there is no fallback to a less authorized reader. The cutoff must be within two minutes of database time on each call. Calendar ordering and source-table RLS remain unchanged. This local backend does not enable the gate, install an operator signal reader or authorize hosted use.

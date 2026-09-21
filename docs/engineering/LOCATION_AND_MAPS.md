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

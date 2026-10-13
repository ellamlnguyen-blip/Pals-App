# TASK-029 Hangout detail presentation handoff

Status: implementation candidate on `agent/TASK-029-reference-screens`; coordinator review and runtime QA remain.

## Outcome

- Rebuilt the saved Hangout detail as an airy two-column plan/place layout. The title, current state, attendee preview, campus time, description, Join or chat action and private instructions read down the left column; the public approximate-area map sits on the right. At tablet/phone widths, the plan and action precede the map.
- Added a dedicated Mapbox detail map using only `public_latitude` and `public_longitude` from the authorized public Hangout row. When the public token or map is unavailable, a clear static fallback and external OpenStreetMap link remain. The external URL uses those same public coordinates and labels the area approximate.
- Kept roster IDs and management actions inside the “Pals attending” disclosure. A visible host/co-host row and attendee preview use neutral role circles from the currently authorized first roster page, never invented names/photos or a total attendee count. The disclosure retains paging, host/co-host controls, cancellation/uncertain response recovery and source-loss clearing.
- Retained `HostDetailBoundary`, `PrivateDetail`, current detail re-read after chat access, existing membership outcomes, chat source check and Safety action.

## Verification

- `next typegen` and `tsc --noEmit`: passed.
- Scoped ESLint for changed TSX files and `git diff --check`: passed.
- `next build`: passed, including `/hangouts/saved/[id]`.
- Source review: no raw profile or photo fetch, no private coordinate on map or external URL, no new permissions/RPC/schema, no guessed Hangout count. The first roster page is used only while the current detail reader's roster/access recheck succeeds.

## Remaining gates

- Coordinator to inspect actual rendered desktop/tablet/390/320 px screens and interaction states in a disposable local runtime, including a working Mapbox token if available. Screenshots were not captured in this worker.
- Coordinator/fresh reviewer to review merged task branch and privacy/navigation behavior. A neutral roster preview remains because authorized names/photos cannot be inferred from the Hangout roster alone; People enrichment was deliberately omitted under the bounded fallback in the contract.
- Publication, remote SHA verification, main status records and integration remain coordinator-owned. This handoff does not claim TASK-029 completion.

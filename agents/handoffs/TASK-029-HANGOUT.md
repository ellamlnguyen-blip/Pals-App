# TASK-029 Hangout detail presentation handoff

Status: implementation candidate on `agent/TASK-029-reference-screens`; coordinator review and runtime QA remain.

## Outcome

- Rebuilt the saved Hangout detail as an airy two-column plan/place layout. The title, current state, attendee preview, campus time, description, Join or chat action and private instructions read down the left column; the public approximate-area map sits on the right. At tablet/phone widths, the plan and action precede the map.
- Added a dedicated Mapbox detail map using only `public_latitude` and `public_longitude` from the authorized public Hangout row. When the public token or map is unavailable, a clear static fallback and external OpenStreetMap link remain. The external URL uses those same public coordinates and labels the area approximate.
- Kept roster IDs and management actions inside the “Pals attending” disclosure. A visible host/co-host row and first-six attendee preview show current People names and primary photos only when independent People/rich RPC consent permits. Rich RPC errors do not fall back to the text RPC; absent rich rows may use the text RPC. Peers link to their current People profile with a validated Hangout return path, while the actor links to their owner profile. Photo gateway failures clear the associated displayed name/photo and link to a neutral role fallback; auth transition, pagehide or tab hiding clears composed identities until refresh. Other roster rows remain neutral, and the first page never claims a total attendee count. The disclosure retains paging, host/co-host controls, cancellation/uncertain response recovery and source-loss clearing.
- After People enrichment, the server rereads current Hangout detail and compares actor, record, role, state and the first authorized roster page before rendering composed identities. Any difference renders the changed/access state instead.
- Replaced placeholder calendar/location glyphs with Phosphor icons already used elsewhere in Pals.
- Retained `HostDetailBoundary`, `PrivateDetail`, current detail re-read after chat access, existing membership outcomes, chat source check and Safety action.

## Verification

- `next typegen` and `tsc --noEmit`: passed.
- Scoped ESLint for changed TSX files and `git diff --check`: passed.
- `next build`: passed, including `/hangouts/saved/[id]` after identity composition.
- Source review: no raw profile or Storage path fetch, no private coordinate on map or external URL, no new permissions/RPC/schema, no guessed Hangout count. The first roster page is used only while the current detail reader's roster/access recheck succeeds.

## Remaining gates

- Coordinator to inspect actual rendered desktop/tablet/390/320 px screens and interaction states in a disposable local runtime, including a working Mapbox token if available. Screenshots were not captured in this worker.
- Coordinator/fresh reviewer to review merged task branch and privacy/navigation behavior. People consent may leave some or all attendee cards neutral, including when the People gate is unavailable. Paged rows beyond the first six are never enriched unless they are visible host/co-host rows in the initial page.
- Publication, remote SHA verification, main status records and integration remain coordinator-owned. This handoff does not claim TASK-029 completion.

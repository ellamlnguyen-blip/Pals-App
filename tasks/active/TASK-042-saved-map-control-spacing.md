# TASK-042 — Separate saved-map home/locate and zoom controls

Status: ready for bounded local UI implementation. Start from current canonical main and merge the exact reviewed local source branch `agent/TASK-041-owner-photos` at `19cf4505a3723b7d714bbf121e1bc404b62c21bf`. TASK-041 and predecessor application-main gates remain open.

## Request and scope

On `/hangouts/saved`, keep the custom Back to UNC and Locate me buttons visibly separate from Mapbox's zoom-in and zoom-out buttons at phone widths. The lower custom button currently overlaps zoom-in. Adjust only the saved map control layout and preserve all four existing actions, keyboard access, location permission behavior, map attribution, period filters, and map/list content. Avoid backend or geolocation changes.

## Acceptance and handoff

At the reported 527px width, verify a visible gap between custom and zoom controls and no controls clipped by the map. Check a narrower phone width and desktop for overlap/overflow. Confirm buttons remain reachable by keyboard, and do not invoke Locate me during QA. Build/typecheck and inspect rendered loading/error as feasible. No mirror test is needed for this reversible CSS placement fix. Record exact source SHA, local preview evidence, and predecessor gates in a handoff; push and independently verify the task branch. Publish a status-only main receipt if application-main integration remains gated.

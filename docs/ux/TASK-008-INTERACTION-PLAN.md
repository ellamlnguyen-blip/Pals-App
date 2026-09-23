# TASK-008 interaction plan

Reading this as: a local campus discovery workflow for verified students, using Pals' friendly blue, rounded, map-first language. The live usepals.com reference was inspected on 2026-09-22; it uses a white canvas, bold rounded type, compact navigation and a campus map. Product behavior follows the accepted specs rather than the site's older wording.

## Desktop and phone

Keep the TASK-004 mock preview visibly separate. A prominent Saved Hangouts entry opens a local-only map/list surface; its results come solely from caller-authorized database reads. On desktop, the map and matching list sit side by side. On phone, controls, map and list stack; the list stays fully usable if tiles fail or the public Mapbox token is absent. Start at the UNC campus viewport without requesting device location. Offer only optional one-shot centering.

The map sends a bounded visible-region request after movement; time and open-joining filters use persisted fields. Show loading, empty, error and limit-reached messages adjacent to the list. Ignore superseded responses from rapid pans/filter changes. Pins and list rows select the same preview. Preview focus moves to its heading and returns to the trigger on close; a stable detail link opens the authorized detail route. Never show exact instructions in map data, markers, list or preview.

Detail shows public information and the current-ready account-ID roster under existing RLS. The host is presented as an account ID without implying a peer profile. State text differentiates host, joined, left, removed, closed, cancelled and unavailable. Join/leave is disabled while its action runs. After the action, a caller-session read verifies persisted membership before the UI claims success. Uncertain outcomes ask for reload. Exact instructions are server fetched separately on an uncached request and rendered only after a final readiness/status/state check. Explain that published joined members retain access after scheduled end until leave/removal/readiness loss/cancellation.

Use existing tokens, rounded controls, clear focus outlines and plain language. No extra data categories, popularity or attendee counts beyond authorized IDs.

# TASK-029 reference screen QA

Date: 2026-10-13, America/New_York. Reviewed application: `210a8ee8f30d6401603bed186f22d76a5f1e31ad`.
Status: local candidate verified for the recorded scope; hosted detail-map and parent acceptance remain incomplete.

## Composition and reference differences

The supplied first image is a Hangout detail reference. Discovery remains map-first. Detail now presents the plan, authorized host/co-host identities, attendee preview, campus time and current joining/chat action on the left, with public approximate location on the right. Phone layouts place the action before the map. Chat is primary after joining; Leave is secondary. Counts say how many attendees are shown instead of claiming a total from a paged roster.

Owner and peer profiles share the reference's circular portrait, centered identity, compact icon facts, wide two-column gallery, interests and separated prompt rows. Owner Edit profile/photos retain the existing validated save/upload flows. Peers receive Add Pal/Message based on real relationship/request state and View-only photos. Individual content and arbitrary prompt questions remain intact. Academic year is not inferred: the stored graduation class is shown honestly. UNC email verification is described accurately, not as separately verified identity/enrollment.

Eligible names/photos come from the existing People/rich projections, never raw peer profiles or Storage paths. A missing permission yields a neutral identity. The reference's restaurant/address does not authorize precision changes: the public pin/link uses only the existing public approximate coordinates. Sample identities and photographs are not real-account defaults.

## Rendered evidence

IAB screenshots were captured from the real locally authenticated app using four fictional local accounts, synthetic image fixtures and one fictional Hangout. The route-availability adapter described below is the only source difference in the QA copy. Actual personal photos from the supplied references were not imported or published.

| Screen | Desktop / tablet / phone evidence | Outcome |
| --- | --- | --- |
| Owner | 1280, 820, 390, 320 px | Circular portrait 180 px desktop / 136 px phone; two gallery columns; no horizontal overflow. |
| Peer | 1280, 820, 390, 320 px | Each person’s authorized content, no edit controls, real pending/none actions; no horizontal overflow. |
| Hangout | 1280, 820, 390, 320 px | Two desktop columns; phone plan/action before map; no horizontal overflow. |
| Empty owner | 320 px | No sample person/photos/hometown; Add main photo once; no edit pencil for nonexistent photo. |

Committed screenshots under `evidence/task029/`: owner-1280/390, peer-1280/390 (Jordan), hangout-1280/390, owner-empty-320 and peer-pending-320 (Alex). The blank/letter artwork is synthetic test image content. Other captures remain in `/private/tmp/pals-task029-qa/task029/`.

## Observed interactions and privacy

- Owner primary photo opens View/Edit. View loads the saved private image; Escape closes and returns focus to the originating photo. Main-photo pencil focuses the selected upload control; absent portrait uses Add instead.
- Actual owner detail save changed hometown and refreshed the summary. Actual synthetic primary replacement upload returned Photos saved and refreshed the portrait/header. These round trips were observed during the task before later presentation-only corrections; final controls preserve the same save logic.
- Peer photo dialog contains View and Close, with no Edit; loaded the authorized image and restored its trigger on Escape at final source.
- Message focused the first-message textarea. Sending only to the fictional local Alex returned Request sent and then Check request. Add Pal produced an outgoing request, visibly reflected after fresh navigation. No real-user message was sent.
- Host profile opened from the Hangout and returned to that exact Hangout. Confirmed Join revealed Open Hangout chat and private instructions; the chat route loaded its authorized composer. Leave removed the instructions and produced the truthful Rejoin state.
- Local real Auth/HTTP checks: authorized peer photo HTTP200/WebP/private-no-store; rich opt-out made the same selector HTTP404. People opt-out removed the peer detail and the host's name/profile link from fresh Hangout HTML. Local preferences were restored through the normal consent RPCs. These checks do not establish hosted acceptance or all multiuser/moderation flows.
- Source review fixed duplicate People focus parameters and missing owner prompts region label. New return tests replace one focus value and preserve exact validated saved-Hangout returns; unsafe/external/malformed routes are rejected.

## Build and environment evidence

Final exact task-source `next build --webpack` passes with TypeScript. Final `node --test tests/*.test.mjs`: 67 passing, zero skips/failures. Workspace ESLint passes; admin TypeScript passes; changed frontend files pass Prettier and whitespace checks. Node24.18.0/pnpm11.25.0 installed the frozen pinned lock; manifests still specify pnpm11.19.0. The pnpm wrapper later attempted dependency reinstallation through the QA dependency symlink and failed without a TTY; final checks used installed binaries directly. No manifest/lock/dependency upgrade is included.

All 69 emitted client JavaScript files in the exact source build were scanned in memory: zero exact local server-photo credential matches. This is a bounded compiled-asset check, not a new claim about every future deployment.

Named disposable DB `pals-task029-disposable` uses 55521/55522/55524 and the exact 38-migration application chain. Existing Pals stacks were not reset or mutated. App runtime `/private/tmp/pals-task029-runtime` is a tracked-source export with installed dependency links and private local env. A loopback-only IPv6 proxy forwards `[::1]:54321` to this new DB's55521, preserving the existing IPv4 stack. Only the QA copy's `studentFeaturesAvailable` exact loopback comparison uses `[::1]`; delivered app guards, auth target validator, database/RLS and all hosted configuration remain unchanged. Runtime is on `http://127.0.0.1:3000`; fictional test sign-ins are in a private local fixture file, not Git.

## Remaining gates

No local Mapbox token was available. The new detail-map failure state and public-coordinate external link were checked; successful tiles/pin/zoom remain unverified and need an allowed token in local QA or an authorized staging deployment. Long-name stress, revoked-photo decoder/load timing, host/co-host mutation/paging, block/removal/cancellation and uncertain transport were source-reviewed/preserved but not all freshly exercised in this task's browser matrix. Previous P2 tests remain historical evidence.

User visual feedback, required hosted owner/peer/student/moderation/recovery acceptance under TASK-027, and reviewed canonical application integration remain open. This task changed no hosted provider/data/gate/domain setting and does not certify a public release.

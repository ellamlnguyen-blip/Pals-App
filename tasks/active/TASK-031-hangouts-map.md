# TASK-031 Hangouts map reference redesign

Status: Stage A reviewed and verified on the named disposable backend; Stage B UI is active. Parent staging/application main integration remains incomplete.
Date: 2026-10-14 America/New_York.
Branch: `agent/TASK-031-hangouts-map`.
Canonical baseline: `37c899d91d3128005f89b79636fb65348cb24a2f`.
Exact dependency: reviewed/published TASK-030 candidate `63fe69c437e22a5b35c2aba58f702badd681479e`, application `5920f1d9f98511d922640f6bec2fe717f6c743dc`.

## Requested outcome and design plan

User asks Hangouts to match two attached reference screenshots: compact Hangouts heading and UNC Chapel Hill label; Create Hangout at upper right; one large rounded campus map; independent Today, Tomorrow, This week and Later checkbox panel over upper left; activity emoji teardrop pins; bottom-right zoom/location controls; rich pointer preview with title, authorized host/co-host/attendees, date, public place, description, View Hangout and currently authorized Join.

Reading this as a brand-preserving campus discovery product for students, with friendly Pals blue/white and playful activity pins. Keep existing logo, Baloo 2 headings, Nunito body, tokens and primary navigation. DESIGN_VARIANCE 3, MOTION_INTENSITY 1, VISUAL_DENSITY 4. Apply Leon's preservation/accessibility/layout guidance to this product screen; marketing hero/motion/gallery prescriptions do not govern its utility controls. Explicit emoji references override the generic emoji discouragement.

Audit: current saved page has a large Meet up/Make it happen marketing block, Time/Joining dropdowns, numbered pins and persistent list rail/basic detail-only preview. Retire these page presentation patterns. Keep routes, Create path, actual saved records, map camera/privacy, alternate list and authorization. Existing local preview currently has no public Mapbox token and shows an honest fallback. usepals.com browsing attempt was inaccessible; existing design direction, tokens and prior direct brand inspection govern, with supplied images the immediate visual authority.

Desktop map is the main first-screen surface; filters float above it and preview anchors to the chosen marker without covering its controls. Tablet/320–390px controls wrap legibly with no page overflow; filters may sit over/just above the map and the card becomes a contained sheet. A keyboard-accessible optional list remains available below/as an alternative, especially when map/location is unavailable. Do not force a persistent desktop side rail. Maintain attribution, visible focus, readable text, 44px controls, hover-to-card continuity, Escape/Close focus return, loading/empty/all-off/error/denied states and map retry.

## Time categories and bounded query

Checkboxes select an independent union of upcoming-start intervals in America/New_York. Today=[one captured cutoff,next local midnight); Tomorrow=[next midnight,midnight+2 civil days); This week=[midnight+2 days,next Monday) when nonempty; Later=[max(midnight+2 days,next Monday),infinity). Tomorrow wins on Sunday/Monday boundary. All four on means all upcoming starts; all off means an explicit empty selection. No past-start/ongoing inclusion change. Explain the disjoint meaning in accessible help and record this disclosed interpretation; actual campus dates replace the sample date.

Time filters must run before the 101-row probe. A bounded read-only query analysis found current `query_saved_hangouts` supports only `upcoming|all` cutoff modes. Stage A may add ONE committed migration replacing this function with its exact existing seven-argument signature, grants, return projection, source checks, gate lock/epoch and ranking intact; extend only `p_time_filter` validation to a strict four-bit period-mask string and add the selected interval predicate inside candidates before ranking/probe. Preserve legacy upcoming/all callers. No tables, columns, RLS, grants, provider or authority change. Stage A includes meaningful actual-role SQL/HTTP/boundary tests and fresh security review before dependent UI dispatch. ADR-0039 records the narrow implementation approach as Proposed, not acceptance of a new authorization strategy or hosted operation.

Web adapter captures one validated cutoff and uses identical viewport/mask/cutoff for both source calls around fresh get_access_state. Compare complete 101-row results, mode and opaque epoch before releasing 100. Preserve gate-off chronological start/ID order and existing gate-on ranking. Strictly validate masks, require 0000 to return no source results and every selected interval to exclude starts before the captured cutoff; retain honest truncation guidance. No client-only filtering of a capped page, unlimited scans, raw/private projection or less-authorized fallback.

## Pins and preview behavior

Emoji is a deterministic visual cue from already public title/description, with a neutral fallback; no new persistent category/taxonomy field or sample/default event content. Pin blue shades may encode time groups as in reference, with text/accessible labels so color is not the only cue. Preserve approximate saved coordinates, viewport queries, coarse camera return memory and optional location centering. Never store/broadcast device GPS or render live people positions; no automatic geolocation request.

Reuse the existing TASK-030 currently authorized public preview reader/identity/photo route and existing membership mutation/outcome verification. Surface only current authorized public details and consent-allowed identities/photos, neutral roles otherwise. No private instructions, raw profiles/Storage paths or hidden membership identifiers in map/preview payload. Roster cap shows neutral View attendees when extra count is unknown. Join only for published/open eligible none/left participation; own host/current attendees/removed/closed/cancelled denial exposes none. Acknowledged Join refreshes preview/current source; uncertain results give recovery without false success. Preserve detail/chat/leave existing paths and browse context with only navigation preferences, not records/identities.

Hover/focus/tap opens fresh preview; pointer transition to the card remains usable. Hover must not steal focus. Keyboard open may move focus into the card; Escape/Close return to trigger without immediate reopening. Abort and clear contents on selection/filter/bounds/source change, auth transitions, hidden/pagehide/BFCache; track overlapping auth tokens and discard late read/mutation results. Fresh server reload precedes redisplay after auth/visibility change. No old user data can unmask.

## Source and execution boundaries

Coordinator publishes this reviewed contract/queues to latest main before implementation. New task branch starts current main and merges only exact reviewed TASK-030 dependency, preserving canonical control/docs. Fresh GPT-6 Sol medium workers: Stage A query migration/adapter/tests; after A handoff/review, Stage B saved page/map/discovery/filter/browse-context/pin/preview UI. Fresh source/security/design review and coordinator real local QA follow. Avoid shared file edits; coordinator owns task records. Tools cannot configure or verify Standard speed.

Only disposable-local backend with fictional fixtures may receive the reviewed new migration, without reset or unrelated stack changes. Preserve dirty shared checkout. Existing public Mapbox configuration may be read for a local loopback test without exposing it in Git/chat; no hosted token restriction, new credential, gate/data/migration/deployment/domain, production or provider security change is authorized here. If local basemap is blocked, complete independent implementation and document the concrete access requirement before requesting a hosted adjustment. No analytics capture enablement or real-user messages.

TASK-027/TASK-028 staged acceptance still gates application main integration. Main receives reviewed docs/evidence only until those gates clear. TASK-031 is explicitly requested new work, not an automatic successor from incomplete TASK-030. Do not mark it complete or dispatch a successor until all applicable gates and reviewed integration are done.

## Acceptance

1. Reference hierarchy rendered at desktop/tablet/320–390px with real Mapbox renderer where configuration permits; honest token/error fallback and alternate list work. Create link, five-nav and direct owner avatar remain functional. Supplied illustrative photos/maps are not used as data/defaults or screenshot backgrounds.
2. Four independent filters including mixed/all-off, timezone/DST/Sunday/month/year boundaries and >100 earlier excluded rows prove filtering precedes probe. Actual-role query checks preserve unauthorized denial, unchanged legacy modes, epoch/ranking/recheck fail-closed behavior.
3. Actual hover/focus/tap preview shows authorized people/date/place/text, View opens existing detail, eligible Join acknowledges membership and disappears for hosting/attending/closed/removed. Current consent/auth loss clears sensitive preview and aborts late responses. Private instructions do not serialize.
4. Relevant units, lint, TypeScript, production builds, fresh review and real fictional-local browser/API privacy checks pass. Render/screenshot loading/empty/error/fallback and core interactions with synthetic content; clearly record unexercised provider/visibility paths.
5. Commit handoffs/docs and source to isolated task branch, push and verify remote task SHA. Publish independently reviewed documentation/evidence milestone on main and verify main SHA. Keep task incomplete until parent acceptance and application integration; no hosted/release claim or duplicate successor.

## Stage A local milestone

Migration/sourcec11e093 plus test correction83f56b7 passed fresh source/security review. Named local55522 has reviewed version20261014000100 (39 migrations), unchanged existing fixture counts/grants. SQL23/23 and geographically isolated legacy64/64 plus actual fictional Auth/PostgREST16 masks/two-read/public-payload checks pass. See TASK-031A.md and TASK-031A-REVIEW.md for methods and limits. UI StageB is active; this does not complete the parent or authorize hosted integration.

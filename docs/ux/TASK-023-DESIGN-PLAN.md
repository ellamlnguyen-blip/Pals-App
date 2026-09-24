# TASK-023 student web visual and interaction plan

Status: Accepted by independent plan review before implementation
Reference inspected: live `https://usepals.com/`, 2026-09-23 EDT, desktop 1280px and phone 390px.
Baseline: canonical `origin/main` `5321e0451a11b4b42987b80a968415644ce9e33e`.

## Design read

Reading this as a map-first campus coordination product for verified UNC students, with a friendly, bright visual language drawn from Pals' live site. Use the existing self-hosted Nunito and native CSS; retain the current app's information architecture and interaction contracts.

The live site uses a white canvas, a soft campus-blue hero, heavy rounded headings, pill actions, rounded map frame, and an activity strip above the map. On phone, its large blue intro stacks above the map. Its current `Explore`, `My activities`, `Memories`, and `Create an event` labels are reference-only. The application keeps **Hangouts · Calendar · People · Chats · Notifications** and **Create Hangout**. The live site's wide horizontal phone navigation is not a model for fitting five accessible destinations.

## Current route audit

| Surface | Current implementation | Alignment work |
| --- | --- | --- |
| Public entry `/` | Separate header and welcome surface; its "Hangouts are coming next" notice is stale relative to the local build | Bring it into the shared welcome treatment and make availability copy truthful to the current local gates without promising hosted access. `/continue` redirects and has no visual surface. |
| Sign-in, signup, verification, onboarding, restriction | `Frame` header and global form primitives; auth split layout | Give the intro and form a consistent welcome treatment, with clear status/error/verification guidance; retain exact form order and auth actions. |
| Hangouts map and saved discovery | Separate mock map shell, saved map/list, detail and join/leave states; map and saved flows have distinct CSS | Give both surfaces the same header, nav, page title, filters, map/list frame and state treatment; keep mock labeling unmistakable and saved access gates unchanged. |
| Create/edit/owned Hangouts | Shared editor plus route-specific styles | Apply shared field, panel and action rhythm; keep public approximate/private exact place hierarchy visually explicit without changing data or validation. |
| Calendar | Own heading, filters, day cards, empty/denied states | Align heading/actions, date controls and day surfaces with shared primitives; keep authoritative Joined/Hosting and public-only behavior. |
| People, friendship, privacy, profiles | Directory/detail/friends/owner editor with local state styles | Align cards, identity, actions, forms and empty/denied states; never add public counts, hidden peer detail or new profile data. |
| Chats and direct requests | Inbox/thread states and access masking | Align list/thread/composer surfaces while preserving denied/unknown masks, focus and revocation behavior. |
| Notifications | Inbox/preferences and own styles | Align list and controls, preserve actor-bound refresh, unread and failure semantics. |
| Safety | TASK-016C dashboard and shared block/report dialogs | Align typography, controls and spacing only; keep exact IDs, report receipts, uncertain outcomes, immediate direct-chat masking, dialogs and focus behavior. |

The dominant inconsistency is structural: `Frame` and the Hangouts map use different headers, navigation is repeated in route files, and each feature has independent page, card, field and state styling. Provisional tokens include only one surface, accent and radius, so hierarchy varies by route. The global `section` rule makes many unrelated surfaces look like identical blue cards.

## System and interaction plan

1. Refine `packages/design-tokens/tokens.css` into a small semantic system: canvas, surface, raised surface, soft-blue feature surface, ink/muted/link/action colors, borders, focus, shadows, radii, spacing and type scale. Define light and dark values with readable action/focus contrast. Keep Mapbox pins legible over either basemap. Because admin imports this package, preserve existing token semantics and smoke-check admin after any shared value changes. Do not redesign admin or introduce another UI framework or font.
2. Create or consolidate shared student layout/navigation and primitives in `apps/web/app/`: brand header, avatar/account entry, five-destination primary navigation, page heading, panel/empty/error/loading treatment, buttons and fields. Preserve route URLs, current labels, feature-gate behavior and signed-out states. Correct nested duplicate `<main id="main">` landmarks in saved Hangout routes; verify one main and a working skip target. No account action should appear to work when the backend gate denies it.
3. Apply the system route by route through existing CSS and components, first shell/auth/map, then creation/detail/Calendar/People, then Chats/Notifications/Safety. Prefer shared classes and tokens over feature-specific color/radius overrides. Keep the map dominant, with discovery controls adjacent and the list available without requiring map use.
4. Desktop: one compact header and navigation row, map with adjacent list where space allows, restrained headings and clear primary action. Tablet: preserve map and list without squeezed controls; stack or resize at a tested breakpoint. Phone: five destinations remain reachable with legible 44px targets and an active indication; map/list and forms stack, dialogs fit the viewport, and no horizontal page overflow occurs. Navigation may scroll horizontally with a visible affordance if all five cannot fit without tiny targets.
5. Loading, empty, error, denied, gate-off and uncertain states use the same visual grammar while retaining their distinct text/actions and data masks. Keep `role`, live-region, keyboard focus, native dialog Escape and focus return. Keep reduced-motion support for any transition. No decorative motion is needed.

## Contract and safety boundary

Presentation only. Do not edit `supabase/`, `apps/web/lib/`, server actions, API routes, access gates, authorization checks, payloads, validation, providers or hosted configuration. The existing profile, Hangout, People, friendship, chat, notification and safety contracts remain authoritative. In particular, approximate public location remains approximate; blocked or revoked people/content remain masked; lost mutation responses remain uncertain; reporting shows only private opaque receipt; and the mock map is labeled as mock.

## Verification and review

- Before and after: inspect rendered public entry, auth, mock/saved Hangouts, create/edit/detail, Calendar, People, profile, Chats, Notifications and Safety at 1280px desktop, about 820px tablet and 390px phone. Include 320px stress check for primary navigation and dialogs, one-main/skip-link checks on saved Hangout routes, and an admin token-compatibility smoke check.
- Render loading, empty, error, denied and gate-off states where available using only disposable local fixtures. Exercise keyboard navigation, focus return, map/list selection, filters, forms and safety unknown/confirmed states. Check light and dark rules, contrast, reduced motion and page overflow.
- Run formatting, lint, types, production builds and relevant existing UI/action regressions. Compare the final diff to the starting SHA and reject any backend, schema, RLS, server action/API or feature-gate change.
- Obtain independent design and security review of the final exact tip. Record actual viewport/state evidence, limitations, task SHA and canonical main SHA in the handoff.

This plan does not close any current backend, hosted, staging or TASK-010 work. Later student-facing tasks should reuse these tokens and components; TASK-021 checks screens added after this pass.

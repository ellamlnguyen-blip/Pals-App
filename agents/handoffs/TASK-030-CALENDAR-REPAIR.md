# TASK-030 Calendar verification repair

Status: bounded Calendar repair complete on the shared TASK-030 branch; parent review, browser acceptance, and integration remain open.

## Outcome

- Day and Week use one 48-pixel-per-hour scale for rows and events. The visible range starts at 8 AM–9 PM and expands to include earlier, later, or multi-day plans. Simultaneous plans receive separate lanes; sequential plans reuse the full width.
- Month remains a seven-day grid inside its own horizontal scroll area on narrow screens. Event controls retain 44-pixel targets and readable text.
- Browser QA at 390px confirmed the Month grid stays inside its own scroll area. Week and Month now show a concise sideways-scroll hint at widths where their seven-day layouts need it; the scroll areas are named, focusable regions for keyboard arrow scrolling. The desktop reference at 1280px has no visible hint.
- Final source review also confirmed 44-pixel month event controls on desktop. Month uses labelled day groups with real buttons rather than an incomplete ARIA grid hierarchy.
- Keyboard Enter/Space moves focus into the nonmodal preview. Escape and Close return focus to the event without reopening it. Moving between an event and the preview retains access; outside focus/pointer interaction closes it.
- Auth transition, pagehide, and hidden-document events abort the preview request, clear its contents, and conceal the Calendar data. Visible return or settled auth reloads the document. Selection and refreshed source props remount the Calendar client. Late membership responses cannot restore cleared preview state.
- Overlapping auth transitions now track every observed token; one settled/cancelled token cannot reload while another remains pending. Visibility and BFCache checks read the immediate concealment ref, including when mounted hidden.
- Brief adjacent Day/Week plans use at least 44px of visual layout and separate overlap lanes, keeping both controls usable without altering their actual start times.
- A capped roster page now offers a neutral “View attendees” link rather than claiming additional people exist when the roster has exactly 24 entries.
- Runtime review found intermittent preview denial when concurrent People reads returned identical identity maps in different key insertion order. The API now compares sorted identity IDs and every name/photo revision value, retaining denial on any changed or missing identity. The preview photo URL parameters match the existing People photo route.
- The three published Calendar source queries now apply host and current-member exclusions before their 101-row limits, so they cannot scan unlimited interspersed rows or hide later eligible results. Cancelled hosting and attending probes are independently bounded. The public query uses a filtered roster anti-join with the permitted `account_id` column; an empty embed failed under the existing column-level grant, and no grant was changed.

## Evidence and remaining gates

- Calendar units: 6 passed, including 18:30 placement, outside-reference hours, three simultaneous plans, cross-day plans, and repeated DST hour.
- Identity comparison units cover reordered identical maps and changed name, photo revision, and identity membership.
- Read-only disposable-local Supabase proof with fictional Maya: the published public query returned only other available plans; the attending query returned three joined plans and excluded hosted plans. The selected-column anti-join passed through the current RLS/grants. No fixture data changed.
- Scoped ESLint and web TypeScript: pass.
- Root coordinator owns full build, rendered desktop/mobile checks, disposable local runtime checks, independent review, publication, and main integration. No hosted operation or schema/provider change was made.

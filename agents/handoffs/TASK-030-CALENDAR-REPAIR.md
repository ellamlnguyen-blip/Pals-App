# TASK-030 Calendar verification repair

Status: bounded Calendar repair complete on the shared TASK-030 branch; parent review, browser acceptance, and integration remain open.

## Outcome

- Day and Week use one 48-pixel-per-hour scale for rows and events. The visible range starts at 8 AM–9 PM and expands to include earlier, later, or multi-day plans. Simultaneous plans receive separate lanes; sequential plans reuse the full width.
- Month remains a seven-day grid inside its own horizontal scroll area on narrow screens. Event controls retain 44-pixel targets and readable text.
- Final source review also confirmed 44-pixel month event controls on desktop. Month uses labelled day groups with real buttons rather than an incomplete ARIA grid hierarchy.
- Keyboard Enter/Space moves focus into the nonmodal preview. Escape and Close return focus to the event without reopening it. Moving between an event and the preview retains access; outside focus/pointer interaction closes it.
- Auth transition, pagehide, and hidden-document events abort the preview request, clear its contents, and conceal the Calendar data. Visible return or settled auth reloads the document. Selection and refreshed source props remount the Calendar client. Late membership responses cannot restore cleared preview state.
- A capped roster page now offers a neutral “View attendees” link rather than claiming additional people exist when the roster has exactly 24 entries.
- Runtime review found intermittent preview denial when concurrent People reads returned identical identity maps in different key insertion order. The API now compares sorted identity IDs and every name/photo revision value, retaining denial on any changed or missing identity. The preview photo URL parameters match the existing People photo route.

## Evidence and remaining gates

- Calendar units: 6 passed, including 18:30 placement, outside-reference hours, three simultaneous plans, cross-day plans, and repeated DST hour.
- Identity comparison units cover reordered identical maps and changed name, photo revision, and identity membership.
- Scoped ESLint and web TypeScript: pass.
- Root coordinator owns full build, rendered desktop/mobile checks, disposable local runtime checks, independent review, publication, and main integration. No hosted operation or schema/provider change was made.

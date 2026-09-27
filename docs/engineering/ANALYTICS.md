# Analytics

## Initial-release scope amendment — 2026-09-26

[Accepted ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) narrows the initial UNC release only. Hosted external capture stays off; complete funnel and repeat-attendance/repeat-host reports or aggregate endpoints below are post-launch scope. Authoritative Postgres records support only outcomes they retain; private attendance is a self-report with no peer/export permission. Preserve local ADR-0023 implementation. Future capture still requires its separate region/access/deletion/IP/geolocation/consent/full-payload/actual raw-retention review; no provider configuration is authorized.
PostHog explains behavior; Postgres records authoritative state.

Instrument onboarding, map views, pin/detail views, create/join, calendar, people/profile, DM/friend requests, notification opens. Avoid unnecessary sensitive location data.

Authoritative outcomes: verified users, hangouts, joins/leaves, attendance, friendships, reports, moderation.

Core funnel: discovery → detail → join → chat → attendance → repeat join/create.

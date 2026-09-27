# Release Checklist

## Initial-release checklist amendment — 2026-09-26

[Accepted ADR-0025](../../decisions/ADR-0025-initial-mvp-scope.md) narrows the initial UNC release only. Verify named deferrals and disabled modes rather than requiring the broader future funnel below. Hosted analytics capture must remain off; no complete-funnel or repeat-outcome claim. Verify refresh-based chats/inbox, text-only peer People, no extra expectation/comfort questions and independent gate-off large-Hangout checks. Real UNC Auth email/HTTPS callback, rich owner onboarding/photo editor, moderator operations, owner photo bearer/cache policy, privacy/safety, backups/recovery and authorized rehearsal remain required. This checklist grants no hosted execution or domain cutover authorization.
Product: MVP reviewed; nav correct; empty/loading/error states handled.
Identity/Safety: verification, block/report, moderator access, location privacy, suspension verified.
Data: migrations used; backup/rollback known; no test data in production.
Testing: critical automation + E2E + staging smoke pass.
Analytics: core funnel verified; no unnecessary sensitive location data.
Deployment: env vars, auth callbacks, Mapbox config, domain/DNS verified.
Launch supply: genuine UNC hangouts exist; no fake inventory; moderators assigned.
Post-launch: monitor errors, reports, join→attendance, and empty-map windows.

# TASK-024 planning handoff

Date: 2026-09-24
Status: Brand-correction prompt prepared; implementation not dispatched

## Outcome
Added a bounded follow-up contract after TASK-023 with a copy-ready implementation prompt. The prompt requires the supplied Pals logo, UNC Carolina blue `#7BAFD4`, white as the dominant canvas/surface, accessible supporting colors, and route-wide shared-token adoption. It explicitly freezes backend schemas, migrations, RLS, APIs, server actions, gates, privacy, safety and authorization behavior.

Committed the supplied source logo at `apps/web/public/brand/pals-logo.png` so a future agent can use the exact asset from the repository. The original source remains unchanged; any transparent presentation derivative must preserve it.

## Remaining work
This is a planning/asset-preparation change only. A fresh implementation task must inspect the current `origin/main`, the supplied asset, the current routes, the accepted backend contracts, the live usepals.com reference and the design skill before changing frontend code. The current TASK-017 work should clear before dispatch to avoid conflicting active changes.

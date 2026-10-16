# TASK-034F — Similarity-ranked Pals UI

Status: ready bounded dependent stage under accepted ADR-0043. Read AGENTS.md, TASK-034, ADR-0043, product/UX/authorization docs, Leon frontend skill, A and D handoffs. Start from verified canonical main plus exact reviewed TASK-033 and TASK-034A/C/D source dependencies. Coordinator owns git, shared docs, local database, browser and publication. Stop with a handoff; do not start a successor product task.

**Outcome.** The existing Discover your next Pal! page uses the current consent-safe `browse_similar_pals` rank after major/year filters, with correct pagination and no match-score disclosure. Preserve the reviewed friend heart/outgoing clock badges and whole-card profile link.

**Owned files.** `apps/web/app/people/page.tsx`, people browse selection/paging helper and focused tests, only directly related Pals UI files. Do not edit chat UI/API, migrations, shared records or auth/gate configuration. No hosted actions.

**Behavior.** Replace `browse_people(p_search:null,...)` with `browse_similar_pals(p_major,p_graduation_year,p_cursor,p_limit<=24)`. Parse the JSON response defensively; cursor is opaque text bound to current filters. Keep major/year-only filters, safe reauthorization, exact friend/pending status badges, visible card shape, photo projection and fail-closed errors. Render no score, hidden field, match evidence, popularity or inferred preference. A stale candidate/owner revision, consent change or expiry starts a fresh first page without leaking old rows. Keep existing `/people` route and response field allowlist.

**Verification.** Focused parsing/paging tests, full web build/TypeScript, desktop/375px browser with named disposable data, actual major/year filter, >24 pagination, profile edit/rich withdrawal refresh, hidden/block/opt-out omission, and badges. Handoff records exact checks, limits, screenshots and remaining parent gates.

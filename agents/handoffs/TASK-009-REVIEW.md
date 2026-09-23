# TASK-009 coordinator review

Date: 2026-09-22
Implementation reviewed: `06101ee68ebb8b42e9f783769faf9fab0aea280e`
Baseline: `29c9343edc560dd0731804b3b9624f8329ad6d4c`
Disposition: reviewed task tip `777d4b875bedd26ea925a4982433809d3b048cc2` accepted; cleanup complete, integration publication pending.

## Scope and security
Fresh read-only reviewer `calendar_review` reported no actionable implementation finding after initial and final source/test audits. Coordinator also inspected actual Hangout grants/RLS, query construction, handoff and scoped diff. Calendar uses caller-only joined embeds before limit; cancelled personal reads rely on existing host/still-joined RLS without expanding cancelled roster access. Both bounded subsets are rechecked and deterministically merged. Payloads omit private instructions, host/account identifiers, full rosters, profiles/photos and historical states. Live readiness, local/loopback guards and default-disabled database gate remain unchanged. No migrations, grants, dependencies, hosted operations or deployment.

## Runtime evidence
Coordinator independently read the logs: `pnpm check` passed 17 unit tests, formatting/lint/typechecks and both builds; two clean resets passed 226 pgTAP assertions each with clean public/private lint; all three serialized real Auth/Storage/Next HTTP/action/concurrency suites passed against the built loopback server. After the CSS-only refinement the web build and formatting/lint/unit checks passed. The known dev-helper invariant is tracked separately; no helper pass is claimed.

Calendar HTTP cases include 107-row truncation and a joined record beyond the first 100 unrelated campus rows, host/left/removed/cancelled filters, private marker/host-ID absence, date overlap/end boundaries, invalid filters, anonymous/suspended/gate-disabled denial. Cross-campus/nonlocal authorization and between-read revocation rely on unchanged shared guard/RLS regressions plus static review, not newly claimed Calendar-specific runtime cases. Temporal tests cover real-date validation, DST 23/25-hour days, Monday weeks, overlap and deterministic order.

## Independent rendered review
Coordinator inspected the built local app using a disposable ready account in the Codex browser. Desktop Day and Week/Joined controls, local saved-only labels and calendar-to-existing-detail navigation worked. Effective 325px and 390px phone viewports had equal document scroll/client widths with readable stacked controls and agenda. Native keyboard form submission and solid focus outline were verified. Browser Back showed loading and a newly updated server-side Hangout title, rather than the earlier title.

Loading, empty range, first-100 truncation disclosure and cancelled personal records were inspected. A temporary outside-repository, loopback-only fetch preload returned 503 solely for public Hangout GET reads; the rendered Calendar showed a clear safe error/reload path with no old results. The preload was removed and normal server restored. Suspending only the disposable account redirected Calendar to the existing restricted page with no Calendar content. Browser viewport was reset and the temporary tab closed. No source fault injection or policy mutation was used.

## Limits
Campus-only local increment. Friendship context/restricted visibility, external calendar integration, hosted auth delivery and all block/report/moderation/deployment prerequisites remain open. Rechecks cannot recall information already delivered to a browser. Dark mode and physical-device performance were not measured in this bounded review. No later task is dispatched.

## CI baseline comparison
[Calendar implementation CI](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35810561283) passes validation and both SQL resets/lint, but the dev-mode HTTP harness fails its existing Hangout action-ID manifest assertion before Calendar cases run. Coordinator fetched job logs and confirmed the identical assertion on [starting main e2e3b2d](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35806871829), before any Calendar code. This is a demonstrated pre-existing harness failure, distinct from the local Next invariant. The contract explicitly permits equivalent built-server verification and excludes unrelated helper repair; all three equivalent local suites pass. Accepted for bounded integration with CI limitation disclosed and the maintenance follow-up updated, not a green-CI claim.

## Cleanup
Implementation agent verified final disposable local reset: gate=false, Hangouts=0, Auth users=0, private photo objects=0. Web/Supabase/Lima stopped and read-only task mount removed; fixture credentials and error preload removed. Final receipt tip changes documentation only; implementation remains the reviewed/tested `06101ee`.

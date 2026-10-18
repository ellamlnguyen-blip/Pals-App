# TASK-042 saved map control spacing — UI handoff

Status: bounded source candidate for coordinator review. TASK-042 remains incomplete until exact-source responsive preview, review, predecessor gates, and canonical-main integration finish.

## Source and behavior

- Branch: `agent/TASK-042-map-controls`; canonical-main contract baseline `6a8aa425c38f69baf347af77a906ae3de1dc2fab`; reviewed TASK-041 source `19cf4505a3723b7d714bbf121e1bc404b62c21bf` merged at `d129fa19f85a220522dfb8f448b8f39df97fd7c4`.
- Implementation source commit: `83bc696c2e18611ee0e3f0fb906ee17a76bca820`.
- Raised only the saved map's Back to UNC / Locate me stack from `bottom: 120px` to `bottom: 180px`. All four buttons and their actions, keyboard behavior, loading/error state, map attribution, filters, and map/list contents retain their existing code.
- The coordinator measured the prior 30px overlap at both 527px and 375px: custom stack bottom 659px, zoom-in top 629px. Moving the stack up 60px predicts a 30px visible gap at those widths. This geometry still needs exact-source browser confirmation.

## Verification

- `git diff --check` and touched-file Prettier check passed.
- Dependency installation in the isolated checkout was unavailable: offline install lacked the Nunito tarball; online install could not resolve the npm registry. A direct TypeScript check with the primary checkout's older linked dependencies failed on missing icon packages and unrelated profile types. Next type generation and webpack build did not finish using those linked dependencies. No successful build/typecheck is claimed.
- No local browser preview was run in this checkout; the coordinator owns 527px, 375px, and desktop exact-source QA and keyboard reachability. Do not invoke Locate me during QA. Loading/error behavior can be inspected without calling location.
- No backend, schema, persistence, geolocation, or hosted environment change was made; this is presentation-only CSS.

## Publication and remaining gates

- Source commit was pushed and independently verified on `origin/agent/TASK-042-map-controls` at `83bc696c2e18611ee0e3f0fb906ee17a76bca820`; `origin/main` was independently verified at `6a8aa425c38f69baf347af77a906ae3de1dc2fab`.
- Coordinator: preview exact branch CSS at both phone widths and desktop; check visible gap, clipping, keyboard access, loading/error; run build/typecheck with complete matching dependencies; review and publish a status-only main receipt while application-main predecessor gates remain open. Integrate only after applicable gates are satisfied.
- This handoff commit's final remote SHA is reported to the coordinator after independent verification. No canonical-main push was performed here.

# TASK-038 status handoff

Status: local UI candidate built, rendered and independently remote verified. TASK-038 is incomplete; predecessor TASK-032/033/034/035/036/037 release and application-main gates are still open.

## Source and outcome

The bounded task contract was published on canonical main `83a0153f47158316c81f731ddf80e6aec0748f1a`. The task branch `agent/TASK-038-header-row` starts from that baseline plus the exact reviewed TASK-037 source `8aa18c5a8d8ee99d5d9164583c00bad432106720`. Its independently remote-verified tip is `f04a4a39eda28718e06ac316a28af92f226e188a`. It changes one shared CSS breakpoint, from 1100px to 720px, and contains the UI handoff and four evidence screenshots. No route, data, API, schema or permission behavior changed.

## Verification

- The named disposable runtime production web build passed compilation and TypeScript. `git diff --check` and Prettier passed.
- Authenticated Chats at 1088, 900, 768 and 721px kept logo, primary navigation and three account controls on one row. At 1088px, the header changed from 151px to 80px high; the nav and account controls both begin at y17.5px. At 721px, the nav ends at x521 and controls begin at x541.
- The existing phone two-row layout resumed at 720 and 375px. Document scroll width equalled viewport width at all checked sizes. The actual preview source was rendered; screenshots are in `docs/ux/evidence/task038-local/` on the task branch.
- Existing 44px targets, focus-visible and current-page styling, and limited-account selectors were left unchanged. A limited-account fixture was not available for direct rendered QA; visiting `/restricted` as a ready user redirected to Hangouts.

## Publication and remaining gates

The first ordinary task-branch push failed because the sandbox could not resolve `github.com`. An escalated push was then explicitly rejected by automatic approval review: the configured destination was not verified for exporting source and handoff files. Ella explicitly approved pushes to `https://github.com/ellamlnguyen-blip/Pals-App.git`. The branch push then succeeded; a separate `git ls-remote` read independently confirmed `f04a4a39eda28718e06ac316a28af92f226e188a`. No alternate path was used. Publish this docs-only status to canonical main; keep app source off main until predecessor release gates close and reviewed integration is authorized.

The AGENTS standing model setting was applied for the fresh task agent as GPT-6 Sol, medium reasoning; dispatch tooling exposed no speed selector, so Standard speed could not be independently verified.

# TASK-029 — Reference screens handoff

Date: 2026-10-13, America/New_York.
Status: reviewed local candidate; task remains incomplete behind recorded map/hosted acceptance and canonical application integration gates.

## Outcome

Implemented the user's supplied Hangout detail and owner/peer profile layouts with a shared gated header, circular portraits/icon facts, personal gallery/interests/prompts, owner Edit/View flows and peer Add Pal/Message/View-only flows. Authorized Hangout identities link to current profiles and safely return to the same Hangout. Joining leads to chat; Leave is secondary. Empty profiles keep honest empty content.

Canonical contract was published and remote verified: task `d77a8e7e84cf1b5f8271690ca3decb45620d2883`, main `bd9737d7fb979a934eaa950a3ca30b3d2537d648`. Task branch starts from that main. Merge `4f0967dcdab234c06f80ca2f849667a6a43ce6fb` imports exact reviewed P2 dependency20cdd69 only into this task branch; application/package/schema/tests matched P2 afterward, while canonical engineering records/corrected controls won their conflicts. No P2 app source was integrated into main by this task.

Reviewed final application `210a8ee8f30d6401603bed186f22d76a5f1e31ad`. Fresh Sol-medium reviewer `ui_review` cleared this exact tip after fixing two findings and reviewing browser-driven presentation/empty-state refinements. Dispatch tools cannot verify Standard speed. Worker records: TASK-029-PROFILES.md, TASK-029-HANGOUT.md and TASK-029-SHELL.md. Full bounded evidence and screenshots: `docs/ux/TASK-029-REFERENCE-QA.md`.

## Evidence

- Final exact-source production webpack build/TypeScript pass; 67/67 units without skips; workspace ESLint, admin TypeScript, scoped formatting and whitespace checks pass.
- Real local browser captures at320/390/820/1280 have no horizontal overflow. Actual owner save/upload and photo focus, peer View-only, Message request, pending friendship, safe Hangout return and Join→chat→Leave were observed using fictional accounts only.
- Real local Auth/HTTP rich-photo revocation200→404 and People-off neutral Hangout identity/link passed. All 69 client JS files contain zero exact local server-credential matches. No new schema/authorization grants or raw peer-photo access was introduced.
- Local QA uses the documented untracked IPv6 route-availability adapter to a named disposable stack; delivered guards and existing stacks remain unchanged. These observations are not hosted acceptance. Supplied personal reference images were not committed or populated into accounts.

## Remaining work and release boundary

Local detail-map successful tiles/pin/zoom requires an allowed public token and remains unverified; fallback and approximate-coordinate link pass. See the QA record for freshly unrun state/transport/mutation tests. Obtain user visual feedback, complete the existing TASK-027 hosted student/peer/moderation/recovery gates, then review the combined dependency/application integration. Source remains on `agent/TASK-029-reference-screens`; publication/main status receipts follow separately. No manual hosted deployment/config/provider mutation, public/domain change or product successor occurred. A pushed task candidate does not complete this task.

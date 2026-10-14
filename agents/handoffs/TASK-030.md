# TASK-030 local implementation handoff

## Outcome and status

Reviewed local candidate on `agent/TASK-030-calendar-account`; application commit `5920f1d9f98511d922640f6bec2fe717f6c743dc`. TASK-030 is incomplete pending existing TASK-027/TASK-028 staging acceptance and reviewed application main integration. This handoff records a local implementation milestone; main receives documentation/evidence only.

The owner/peer unlabelled short bio appears below facts; new/changed saves allow two sentences while unchanged legacy text survives. Header avatar directly opens Profile. Own bottom utilities include Safety, Analytics, Attendance and a separate Account editor. Profile editing cannot rename the owner; Account controls name, confirmed/pending email and password using existing caller Auth. Calendar matches the supplied hierarchy with Day/Week/Month, independent yellow Hosting/green Attending/blue other-plan filters, no create action, accessible hover/focus/tap preview and current-authorized Join only for blue plans. Joining refreshes membership/category.

Fresh GPT-6 Sol medium workers produced the profile/navigation, Account, Calendar and repair/visual handoffs. Fresh security/design review addressed privacy concealment, time layout, focus, roster truthfulness, identity ordering and bounded source queries. Coordinator checked the final midnight, bio and limited-access header fixes; a separate fresh Sol-medium reviewer subsequently cleared those four narrow commits and the final documentation/screenshot hashes. Dispatch tools cannot configure or verify Standard speed.

## Verification and source boundary

See `docs/ux/TASK-030-CALENDAR-ACCOUNT-QA.md` and `agents/handoffs/TASK-030-REVIEW.md` for exact scope, results and screenshots. Final builds/TypeScript pass; 80 units without skips and full lint pass. Real fictional local Auth/actions, both email confirmation legs, password update, profile/name conflict handling, private preview, People consent, closed Join and suspension checks pass. Actual desktop/tablet/320–390px browser checks include pointer/keyboard/tap preview, Join→attending, independent filters, utilities, two-sentence bio and cross-tab Account clearing.

Contract published at task `2302b7082033e763ffccf0bb8dfdbc00592f86e5` and main `9069fce76f140c13012ae68469661c215ef8c224`. Exact reviewed TASK-029 dependency is `99f27d6a7820afee2eedc2118e99410bb06ca5d7`. QA export matches source except the two local-only routing adapters documented in QA. The original dirty checkout, existing stacks, provider settings and delivered guards are preserved. No migration, RLS/grant, hosted data/gate/deployment/domain, production, analytics capture or real-user communication change.

## Preview and remaining work

`http://127.0.0.1:3035/calendar` remains running on a named disposable backend with fictional Maya. Existing 3000 preview links redirect there using an untracked local helper. Private fixture credentials and runtime configuration stay outside Git. Synthetic screenshot hashes are committed; user reference images are excluded.

Complete existing staged student/peer/moderation/recovery gates, provider-specific/hosted Auth verification and TASK-029 detail-map tiles verification, then review and integrate the combined application on main. ADR-0038 remains Proposed. No automatic next task is created because application integration and parent acceptance are incomplete. Remote task/publication receipts are added after exact SHA verification.

## Verified task publication 2026-10-14

Source/handoff candidate `63fe69c437e22a5b35c2aba58f702badd681479e` on `agent/TASK-030-calendar-account` was pushed and independently verified with `git ls-remote`. Application is unchanged from `5920f1d9f98511d922640f6bec2fe717f6c743dc`. The bounded documentation publication starts from verified main `9069fce76f140c13012ae68469661c215ef8c224`; its reviewed integration receipt follows after push. No application merge or task-complete claim.

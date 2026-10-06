# TASK-028P coordinator handoff

Status: **incomplete**. Authorized owner/current People-text UI is reviewed and locally verified; requested rich peer profiles await explicit Proposed ADR-0036 acceptance and bounded security implementation. Parent TASK-027 staged acceptance still gates TASK-028/main application integration. No successor is dispatched from this substage.

## Reviewed result

Branch `agent/TASK-028P-profile-remodel` starts from remote-verified canonical `c6a4a3c156f6149c5324a6dd6f3abede2d99ea77` and reviewed TASK-028 dependency `0b1269cfb6f5e77fe112abf31d21c6caa8696666` (merge `1fcce41`). Final app code is `2e9fa9591b3ee802cf38d7e54729c0079e677134`; frontend handoff `13df5ec`, independent source review receipt `005712b`.

The owner now opens a reference-led readable profile with private hero/four extra photos, academic facts, conversation prompts, grouped editing and separate photo controls. Compact Pals chrome retains gate-aware navigation, Safety/account choices and accessible focus. Existing allowed-text peer profiles expose actual friendship and consent-based DM states; accepted chats and pending requests navigate correctly. Lifecycle/access denial clears peer text/actions. No new backend projection, schema, RLS or Storage grant was added.

## Verification and review

`design-qa.md` records same-input source/render comparisons, responsive measurements at320/390/793/1280, AA token ratios, typography and honest differences. Browser tests passed real Auth sign-in/out, valid save/cancel/reload, invalid/stale-draft preservation, primary replacement/extra removal/add, menu focus, friendship request/cancel/accept, first request, recipient consent, accepted chat and People opt-out denial. The final cross-tab sign-out test passed on exact2e9fa95 after a discovered stale-peer bug was corrected. Visibility-event runtime coverage is not claimed because the provider reported document.hidden=false; unchanged hosted block/moderation flows were not newly certified.

Focused ESLint, web TypeScript, format/diff checks and final isolated production webpack build pass. Existing profile/friendship units pass5/5 without skips. Independent source review is clear; React checklist adds no material finding. Proposed rich-profile technical design independently cleared planning review after lock-order correction; no rich backend runtime exists.

## Review preview

`http://localhost:3029/profile` runs the final production build in `/private/tmp/pals-task028-profile-runtime`, detached PID48744 at publication preparation. Manifest verifies991 committed files with zero mismatches except three documented local-copy target/origin substitutions. Private credentials: `/private/tmp/pals-task028-runtime/PROFILE-TEST-SIGN-IN.txt` (0600). Three fictional fixtures use genuine local Auth/Mailpit. Earlier127.0.0.1:3000 preview and user fixture remain intact. Local readiness `/api/health`503 is the existing hosted-only contract; actual local routes/Auth work. No Mapbox token/live tile claim.

## Publication and remaining gates

Implementation/evidence `a9381aeb7a3b48da8819ba696bab560a1ef793a6` and documentation-only main integration `5495f83deeadfd18fc0cf25e968d3ace7243827f` are pushed and exact remote-verified. Full receipt: `TASK-028P-PUBLICATION.md`. Unfinished app source remains on the task branch. No hosted migration, production/domain change, safety weakening, public owner-photo URL or automatic expansion of People consent occurred.

Remaining: user's explicit ADR-0036 choice; if accepted, fresh bounded reviewed rich consent/projection/gateway/migration/race work; parent staged student/moderation/recovery acceptance; reviewed canonical app integration and remote verification. Current approval is required by AGENTS.md: “major ADRs need explicit acceptance.” Full requested rich-peer completion is not claimed.

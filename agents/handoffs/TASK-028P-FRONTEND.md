# TASK-028P frontend implementation handoff

Status: review ready; browser interaction and visual QA remain with the coordinator. This is an authorized UI substage of incomplete TASK-028P, not a completed or integrated product task.

Branch: `agent/TASK-028P-profile-remodel`. Baseline: reviewed TASK-028 source `1fcce41` on the task branch; canonical main contract was remote verified as `c6a4a3c156f6149c5324a6dd6f3abede2d99ea77` by the coordinator.

## Outcome

- Owner profile opens as a readable, responsive profile: private streamed primary photo, real name and UNC email badge, bio, university/major/class facts, existing extra photos, and existing conversation prompts. Empty content has visible, actionable states; failed photo streams have reload feedback.
- `Edit details` opens the existing grouped editor with every existing rich field, save/cancel, draft and revision behavior. `Manage photos` opens the existing private per-slot add/replace/remove controls and cleanup path. The app shell and primary navigation remain in place.
- Options consolidate the access explanation and People sharing preview/management links. The copy states the actual UNC confirmed-email signal and the current private/photo versus opt-in text boundary.
- Peer detail uses the same profile summary typography for only the current People RPC text projection. A neutral photo placeholder avoids fabricating or releasing photos; there is no hometown or prompt disclosure. The existing FriendControl, first-message RequestControl, and SafetyActions continue to own their permission and retry states. The options control exposes report/block actions.

## Verification

- ESLint on changed profile and peer files: passed with zero warnings.
- Web TypeScript `tsc --noEmit`: passed.
- Separate-worktree Next production build: passed.
- `git diff --check`: passed.
- Real browser desktop/mobile, interaction, save/photo/reload and screenshot comparison: pending coordinator QA. No claim of visual or API flow pass yet.

## Boundaries and remaining gates

No migration, backend action, Storage gateway, People RPC, permission or dependency changed. Peer photos, hometown, extra details and prompts await ADR-0036 acceptance and a separate security contract/review. Existing owner photo originals remain private; display still uses the opaque `/profile/photo?slot=...` route. The coordinator owns design QA evidence, independent review, shared records, branch publication and parent integration.

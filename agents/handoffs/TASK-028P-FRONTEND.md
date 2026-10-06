# TASK-028P frontend implementation handoff

Status: review ready; browser interaction and visual QA remain with the coordinator. This is an authorized UI substage of incomplete TASK-028P, not a completed or integrated product task.

Branch: `agent/TASK-028P-profile-remodel`. Baseline: reviewed TASK-028 source `1fcce41` on the task branch; canonical main contract was remote verified as `c6a4a3c156f6149c5324a6dd6f3abede2d99ea77` by the coordinator.

Source commits: `bcb999f9feef165c4e2ec6d3909643871b7b0c91`, then review corrections `d4895a1cfbf664861203d4d370970e37b79bf95f`.

## Outcome

- Owner profile opens as a readable, responsive profile: private streamed primary photo, real name and UNC email badge, bio, university/major/class facts, existing extra photos, and existing conversation prompts. Empty content has visible, actionable states; failed photo streams have reload feedback.
- `Edit details` opens the existing grouped editor with every existing rich field, save/cancel, draft and revision behavior. `Manage photos` opens the existing private per-slot add/replace/remove controls and cleanup path. The app shell and primary navigation remain in place.
- Options consolidate the access explanation and People sharing preview/management links. The copy states the actual UNC confirmed-email signal and the current private/photo versus opt-in text boundary.
- Peer detail uses the same profile summary typography for only the current People RPC text projection. There is no hometown, photo, or prompt disclosure. The existing FriendControl, first-message RequestControl, and SafetyActions continue to own their permission and retry states. The options control exposes report/block actions.
- Review correction: peer detail now starts with authorized text and has no photo placeholder or fabricated copy. Add friend/Say hi follow academic facts; Say hi focuses the request text area (or heading when unavailable). The verified badge on a returned People detail is supported by the live confirmed-UNC access predicate behind that RPC.
- Profile-only compact header uses Baloo Pals text and Phosphor icons, with an accessible options menu. It preserves the same gate-aware primary destinations as the shared shell, plus Safety, analytics choice, attendance when enabled, and sign out. The menu closes on Escape/outside click and returns focus. Owner editor/photo controls focus their first control; forced scrolling respects reduced motion. Save success returns to the readable profile with inline status.
- Shared profile palette tokens use AA blue for action and smaller text on white/pale surfaces. Type scaling reaches the reference dimensions near its 793-pixel width while keeping 320-pixel minimum sizes.

## Verification

- ESLint on changed profile and peer files: passed with zero warnings.
- Web TypeScript `tsc --noEmit`: passed.
- Separate-worktree Next production build: passed.
- Review correction build and focused checks rerun after the final source commit: passed.
- `git diff --check`: passed.
- Real browser desktop/mobile, interaction, save/photo/reload and screenshot comparison: pending coordinator QA. No claim of visual or API flow pass yet.

## Boundaries and remaining gates

No migration, backend action, Storage gateway, People RPC or permission changed. One approved UI dependency, `@phosphor-icons/react@2.1.10`, was added after checking the npm registry's latest tag. Peer photos, hometown, extra details and prompts await ADR-0036 acceptance and a separate security contract/review. Existing owner photo originals remain private; display still uses the opaque `/profile/photo?slot=...` route. The coordinator owns design QA evidence, independent review, shared records, branch publication and parent integration.

# TASK-020B handoff — student large-Hangout UI

Status: implementation complete on `agent/TASK-020B-large-hangout-ui`; awaiting fresh exact-tip review and coordinator integration. No hosted operation or gate enablement.

Baseline: canonical `origin/main` `0d20e83f992cfbc8a02162a4f20bcf29821584ca`. Worktree: `/private/tmp/pals-task-020b-ui`. The final branch SHA is reported separately after push because this committed handoff cannot contain its own SHA. The coordinator owns shared status records and main integration.

## Result

- Saved map/list discovery uses A's caller-bound `query_saved_hangouts` twice with identical bounds, filters and captured cutoff around a fresh access check. It validates the exact public projection and compares all 101 ordered pins, epoch and ranking mode before exposing at most 100. Mismatch, denial or error clears prior results; no direct-table fallback remains. Copy identifies small-first ordering only when the RPC reports that mode and retains chronological limit copy when the gate is off.
- A current immutable host sees the accepted exact warning only after the host-only size RPC returns `is_large=true`. A failed/denied size read shows a generic unavailable note and does not claim the group is small. Nonhosts receive neither the size flag nor the control. Existing map fallback, membership, chat, Safety, private instructions, Calendar and analytics behavior remain.
- The host's one close/reopen action sends the current expected revision and desired state to existing `set_hangout_joining`. It claims success only after the RPC returns the next revision and a fresh caller-authorized read matches both revision and state. Stale, lost-response and conflicting results request reload without a blind retry. Access loss synchronously masks mounted detail and private content before hard navigation. The control announces current state, keeps a 44px minimum target and restores keyboard focus to the new action after verified success.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` and the final production web build passed. Node suite: 46 passed, zero failed, one existing loopback-sandbox skip. A focused UUID regression proves a valid five-group ID reaches the action validation boundary and malformed IDs are rejected. `git diff --check` passed.
- Built web with real disposable-local Auth/PostgREST and synthetic host/viewer: 24 members did not show the warning; 25 members did. The viewer saw no host control/size warning; its direct host-size RPC was denied. Host close and reopen succeeded through the actual UI and changed the server state; a concurrent revision change left the stale mounted control reload-only. Gate-off host size showed the generic unavailable note while the independently authorized joining action still worked. Removal of the mounted host's required profile photo caused action denial and immediate departure to onboarding, with roster and private instructions absent. With 100 pins mounted, Hangout gate-off refresh cleared all pins and showed denied state.
- More than 100 synthetic candidate Hangouts verified small-first 100-row truncation and truthful copy; turning the size gate off restored chronological ordering/copy. The no-Mapbox-token fallback retained the list. The rendered host panel fit 390px and 320px viewports without horizontal overflow; its button measured about 50px high at 320px. After a verified close, focus landed on “Reopen joining.” Added CSS uses shared color, surface and focus tokens, including the existing dark token rule.
- A's integrated backend handoff records real Auth/PostgREST gate-epoch flip and cancellation between the two RPC reads. This B pass verified the adapter's complete comparison in source and denied/gate-off behavior in the built UI; it did not independently orchestrate a gate flip in the narrow interval between B's two live RPC calls. A lost network response was not deterministically injected into the built UI; the action treats missing RPC success as uncertain and never claims it as a save.

## Cleanup and next gate

`pnpm db:reset` removed all synthetic fixtures: zero Auth users, Hangouts and Storage objects; all ten feature gates were individually verified false. The built Next server was stopped and port 3000 freed; Supabase and the owned Lima VM were stopped. Temporary scripts, credentials and local env file were removed and the QA browser tab closed. The prior TASK-019 server occupying port 3000 was gracefully stopped under coordinator authorization and was not restarted because its previous environment is unknown.

Obtain a fresh exact-tip design/security review, then integrate accepted B and this handoff with coordinator-owned status records into canonical main. This task agent stops at the branch handoff.

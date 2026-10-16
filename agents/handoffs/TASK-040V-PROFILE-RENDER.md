# TASK-040V authenticated profile render QA

Date: 2026-10-16. Result: **rendered checks passed** on the reviewed TASK-040 UI plus TASK-039E repair. This is a bounded QA handoff, not TASK-040 completion or application-main integration.

## Source and isolated runtime

- Branch: `agent/TASK-040V-profile-render`. Baseline canonical main `5df5763ee1d01158c825339acd8bd4481e31ce26`; exact remote-verified TASK-040 UI `04ac5440428413d77a08a80d5c7e396b1969e1d7` merged at `92a55ba`; exact remote-verified reviewed TASK-039E repair `ea9befb4068662956a4492ea0a607bd966afb109` merged at `09ae87b2d885f1071486bf137fea7cf8adab2854`.
- No application source was edited on this branch. The unmodified checkout passed a webpack production build, including TypeScript and `/profile` plus `/people/[id]` route generation.
- For browser QA only, a task-owned disposable source copy substituted local endpoint `54321` with `55821` in `packages/config/src/index.ts`, `apps/web/lib/config.ts`, and `apps/web/lib/feature-runtime.ts`; `apps/web/lib/config.ts` also substituted the app origin `3000` with `3041`, then used `localhost:3041` as the browser origin to separate cookies from other `127.0.0.1` task previews. No profile, safety, auth flow, schema, or permission implementation was changed in that copy. Its webpack production build passed.
- Pinned Supabase CLI 2.117.0 started project `pals-task040v-disposable` on 55821/55822/55824. All 52 unique migrations applied. Two synthetic confirmed `@unc.edu` Auth users were created only there: owner Alex Morgan and peer Jordan Lee. The task-owned DB's availability, onboarding, people, friendship, DM, notifications, hangouts, optional-profile, People-directory and safety flags were enabled to exercise existing gated/RLS paths. Authenticated REST returned `ready` and the owner profile under its normal RLS policy. No hosted/shared state was used.

## Browser findings

The browser showed owner **Alex Morgan** immediately before owner screenshots, and peer **Jordan Lee** with the synthetic peer ID on the peer route. Earlier `127.0.0.1` navigation showed a transient signed-out state amid other task previews, so final captures used the distinct `localhost` cookie host and checked the displayed actors. The task-owned web port remained 3041. No shared 3035 tab or server was used.

| Route and width | Render and accessibility evidence |
| --- | --- |
| Owner `/profile`, 811px | `Profile controls` contains Back to Hangouts and Edit profile; no `Profile options` or `.profile-options-wrap/.profile-options` DOM nodes. Action width is 140px, with no menu reservation. Document scroll width = viewport width = 811px. Owner content, Photos, Interests, prompts and account/safety footer remain visible. |
| Owner `/profile`, 375px | Same two controls and 0 options nodes. Back bounds 16–125px; Edit bounds 219–359px. Document scroll width = viewport width = 375px. No blank trigger or horizontal overflow. |
| Peer `/people/[id]`, 375px | 44px Profile options trigger, expanded menu exposes Profile sharing, Block this account, Report this account. Document scroll width = viewport width = 375px. |
| Peer `/people/[id]`, 811px | Same 44px trigger and all three menu actions; document scroll width = viewport width = 811px. |

From owner Back, Tab focused Edit profile with a visible solid outline; activating Edit opened the details form and Cancel returned to display. On the peer menu, Tab focused Profile sharing, and Tab from Block focused Report, each with a visible solid outline. The retained Profile sharing link opened `/people/privacy` and showed the synthetic owner's sharing controls. The owner footer Safety link opened `/safety`. Header Notifications and owner Account links remained in the accessibility tree. No report or block mutation was submitted.

Full-page browser screenshots are committed in `agents/handoffs/evidence/TASK-040V/`: `owner-811.jpg`, `owner-375.jpg`, `peer-options-811.jpg`, `peer-options-375.jpg`. Their synthetic profile text contains no real student data or credentials.

The task-owned Next preview, Supabase containers, volumes and network were stopped/removed. Port 3041 had no listener; no TASK-040V Docker resources remained. Temporary runtime, fixture credentials and local environment files were removed. `pals-local`, TASK-028/029, TASK-039D, shared 3035, and hosted resources were untouched.

## Remaining gates

Coordinator review, shared-status publication and accepted application-main integration remain. TASK-039D and earlier predecessor/release gates remain open. This QA receipt does not authorize a hosted change or mark TASK-040 complete.

## Publication receipt

Source, handoff and screenshot commit `1f9021ecfe3334c5e7cdf6f87f0ca7eccbc997fc` was pushed to `origin/agent/TASK-040V-profile-render` and independently verified at that SHA. `origin/main` was independently verified at `5df5763ee1d01158c825339acd8bd4481e31ce26` before this receipt; no TASK-040V change was pushed to main. The final documentation-receipt tip is reported to the coordinator after its separate remote verification.

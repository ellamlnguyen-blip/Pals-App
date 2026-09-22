# Handoff — TASK-007 Create/edit Hangouts

Date: 2026-09-22
Agent: GPT-6 Sol / medium
Branch/worktree: `agent/TASK-007-create-edit-hangouts`, `/private/tmp/pals-task-007-create-edit`
Starting main: `bebef7045175dfd5d0513c5f3192c2180e2ffa3a`
Task implementation commit: `a3b7e53d000953a409809ee0a480a172b401276b`, pushed and remote-verified
Integrated main SHA: `16e8b015cc42f3323e854c9db41e9412e3a39f21`, coordinator reviewed and remote verified
Main status-record path: coordinator owns `tasks/NOW.md`, `tasks/BACKLOG.md`, `docs/operations/CURRENT_STATE.md`, `CHANGELOG.md`.
Outstanding blocker: none for bounded local implementation; hosted safety/deployment gates remain separate.

## Outcome

Added a ready-only local Hangout creation form, explicit approximate public area picker with manual fallback, owner confirmation/edit route, and a small recent-owned list distinct from mock discovery. Create and edit consume the accepted TASK-005 RPCs with the caller's public Supabase key/session. No schema, hosted provider, discovery pin, joining, chat or cancellation UI changed. The existing mock map remains available outside the local create increment.

## Files changed

- `apps/web/app/hangouts/actions.ts`, `apps/web/lib/hangouts.ts`, `apps/web/lib/hangout-time.ts`: local target/ready/owner checks, normalized input and DST handling, RPC writes, retry identity, revision conflicts and live read verification.
- `apps/web/app/hangouts/editor.tsx`, `create.css`, `new/page.tsx`, `owned/[id]/page.tsx`, `owned-list.tsx`, `page.tsx`, `shell.tsx`: create/edit/confirmation, map/manual area selection, recent owned access and local entry.
- `docs/ux/TASK-007-INTERACTION-PLAN.md`: interaction and responsive plan.
- `supabase/tests/hangout-action-checks.mjs`, `auth-storage.integration.mjs`, `tests/hangout-time.test.mjs`: real Next action/HTTP and timezone regressions.

## Behavior and authorization

Create requires title, explicit America/New_York local start and broad public place/coordinates. The UI rejects DST gaps and repeated hours; an unchanged stored repeated-hour instant remains editable. Manual and map coordinates are normalized to three decimals before RPC. Optional description/end/campus area/private instructions follow backend limits, and blank private instructions clear on edit. Public and private labels explain their different readers. The form does not use device location, browser draft storage or exact instructions as a public pin source.

Server pages and actions require `APP_ENV=local` and the validated loopback Supabase target. Live readiness is checked for action calls without redirecting away from an uncertain create. The database gate and owner RLS still independently control every read/write. An interrupted create retains its UUID and frozen normalized payload, and a safe replay resolves the original ID even after its start time passes or later owner edits. Temporary gate/readiness denial during replay stays uncertain so the browser retains that identity. Read-after-write checks confirm an owner-visible record before reporting success; private and public owner reads get a final ready/revision/status check. Edit consumes the backend revision and retains entered text on stale rejection, with a separate-tab latest-record review link. Direct table writes and unsupported visibility/eligibility remain denied by TASK-005.

## Verification

- `pnpm check`: passed formatting, ESLint, TypeScript, 14 unit tests and web/admin builds after the last UI change. `git diff --check` passed.
- `pnpm db:verify`: two clean local resets, 226 pgTAP assertions on each, schema lint clean.
- `pnpm test:auth:web`: all 3 serialized real local suites passed. New actual Next server-action cases cover gate-off/anonymous create, owner create/replay/no duplicate, changed replay denial, owner/peer read, public coordinate rounding, private clearing, stale edit, peer/forged-ID edit denial, revoked readiness, gate revocation/recovery and restored same-request resolution. Existing backend tests cover atomic rollback, races, campus/private/RLS and denied direct DML.
- Rendered in Codex browser against a disposable ready local account: desktop create → saved confirmation → edit → private clear, recent owned list, loading and disabled saving state; 390×844 phone form/map fallback/actions with document width equal to viewport; native required-field focus. With the existing TASK-004 public Mapbox token only in the local process environment, the basemap loaded, a click set approximate coordinates and a visible marker, and manual coordinate changes moved that marker. No token was copied into source or committed.
- Final local reset confirmed `gate=false`, `hangouts=0`, `auth.users=0`, and `profile-photos` object rows `=0`. The disposable UI photo was detached/removed through the Storage API before reset. The stack is stopped at handoff.

## Decisions and limitations

The scope remains local only under Accepted ADR-0010. The map/public place is user supplied; software cannot prove a label is nonsensitive, so the form gives direct guidance. Without a Mapbox token, the manual area inputs still work. No discovery pin or chat is created on save. The owner list is bounded to six recent records. Stale edits retain text in the current tab; the latest saved details open in another tab for comparison. A request deliberately abandoned after an uncertain create cannot be recovered from browser storage, because private drafts are intentionally not persisted.

Hosted HTTPS callback/real UNC email delivery (TASK-003), block precedence/moderation and launch gates remain open. Those are not waived by local test success. TASK-008 discovery, TASK-010 lifecycle UI and TASK-013 chat remain separate tasks. Suggested coordinator shared-record update: TASK-007 implementation is ready for review with the above evidence; mark complete only after accepted integration and remote verification.

## Ready for next task?

Coordinator review and main integration are complete. Do not dispatch TASK-008 from this handoff alone.

## Remote verification receipt

`git push -u origin agent/TASK-007-create-edit-hangouts` succeeded. The coordinator independently verified the final remote task tip `b6f338e314f1eca489cea0592acd5abc069a8884`, reviewed/integrated it, and verified published main `16e8b015cc42f3323e854c9db41e9412e3a39f21`. [Exact task-tip GitHub CI](https://github.com/ellamlnguyen-blip/Pals-App/actions/runs/35799547768) passed validation and database jobs. This final receipt is on a later main documentation commit.

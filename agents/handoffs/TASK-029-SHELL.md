# TASK-029 shared shell and return path handoff

Branch: `agent/TASK-029-reference-screens` from canonical `bd9737d`, with reviewed P2 dependency `4f0967d` merged by the coordinator. Scope: shared student header/navigation and People profile return validation only. This is a subtask handoff, not task completion.

## Outcome

- `Frame` renders the existing student header on profile chrome screens. The existing account menu, Safety, sign out, photo fallback and destination availability gates remain in place.
- Header layout puts the existing blue logo at left, five destinations in a desktop row, and account controls at right. The active destination uses a pale blue pill with blue text. At smaller widths, destinations wrap visibly within the header, with no horizontal navigation strip.
- `safeReturn` accepts only validated People filter/focus URLs or the exact local `/hangouts/saved/{UUID}` path with optional UUID `focus`. It rejects duplicate, unknown or malformed parameters, external URLs, encoded path separators, fragments and nested routes. Invalid values fall back to `/people`.
- After rendered review, header navigation uses Nunito 600 with readable brand blue text and a pale active pill. The logo keeps its intrinsic aspect ratio at desktop and phone sizes.

## Evidence

- Focused `tests/people-safe-return.test.mjs`: 2 passing tests, including malicious return shapes and valid browsing context.
- ESLint on owned TypeScript and test files: passed.
- `pnpm --filter @pals/web typecheck`: passed.
- `git diff --check`: passed.

## Remaining gates for coordinator

- Inspect shared header at 1280, tablet, 390 and 320 px in the disposable runtime and review all destination/denied states. Runtime and merged profile/detail screens are coordinated elsewhere.
- Run final integrated checks, privacy/navigation review and task publication after all screen subtasks land. Saved Hangout return from peer detail gains a harmless `focus` query from its existing page logic; the detail route ignores it.

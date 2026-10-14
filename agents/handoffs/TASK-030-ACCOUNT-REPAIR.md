# TASK-030 account privacy repair handoff

Status: bounded account repair committed on the TASK-030 branch; combined review, local Auth HTTP proof, and coordinator integration remain pending.

## Outcome

- Account fields and current/pending email are concealed and unmounted on local or cross-tab Auth transitions, page hide, and tab hiding. A resumed tab performs a full server reload before showing account details again; an in-progress Auth transition waits for settlement. No cached client state unmasks the old actor.
- In-flight name, email, password, and security-code results are ignored after concealment. Name and email drafts remain on ordinary save errors. Password inputs clear immediately after request capture, including on errors; the email form's current password clears immediately while its address draft remains.
- Current-password input and server validation both accept 1–128 characters. Email guidance uses user-facing confirmation language, and the optional security-code controls sit in an accessible disclosure.
- No Auth/provider configuration, schema, RLS, gate, or credential flow changed.

## Verification

- `node --test tests/account-input.test.mjs`: 3 passing tests, including current-password bounds.
- Scoped ESLint and web TypeScript passed using existing local binaries. Scoped Prettier and `git diff --check` passed.
- Local disposable Auth HTTP behavior and cross-tab browser lifecycle still require combined runtime proof. The worktree's `node_modules` symlink points to the TASK-029 checkout, so `pnpm exec` aborted its workspace safety check; direct local binaries ran successfully.

## Remaining gates

Coordinator to run disposable-local email pending/confirmation, password/re-auth, same-user proof, and stale name revision HTTP checks; fresh privacy review; and combined browser QA before accepting TASK-030. Hosted Auth confirmation configuration remains unverified.

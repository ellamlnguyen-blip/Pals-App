# TASK-030 account privacy repair handoff

Status: bounded account repair committed on the TASK-030 branch; combined review, local Auth HTTP proof, and coordinator integration remain pending.

## Outcome

- Account fields and current/pending email are concealed and unmounted on local or cross-tab Auth transitions, page hide, and tab hiding. A resumed tab performs a full server reload before showing account details again; an in-progress Auth transition waits for settlement. No cached client state unmasks the old actor.
- In-flight name, email, password, and security-code results are ignored after concealment. Name and email drafts remain on ordinary save errors. Password inputs clear immediately after request capture, including on errors; the email form's current password clears immediately while its address draft remains.
- Current-password input and server validation both accept 1–128 characters. Email guidance uses user-facing confirmation language, and the optional security-code controls sit in an accessible disclosure.
- No Auth/provider configuration, schema, RLS, gate, or credential flow changed.
- Secure email change's first confirmation callback can carry only a message and no PKCE code. That callback now returns to the fixed `/account` destination only when fresh cookie Auth still reports a distinct pending email and the live access gate is ready. The query message is never displayed or trusted as confirmation; code, error, signed-out, and nonpending paths keep the existing verification handling.
- Account heading now overrides the global navigation `header` flex style so its title and introduction stack at narrow widths.

## Verification

- `node --test tests/account-input.test.mjs`: 3 passing tests, including current-password bounds.
- Scoped ESLint and web TypeScript passed using existing local binaries. Scoped Prettier and `git diff --check` passed.
- The worktree's `node_modules` symlink points to the TASK-029 checkout, so `pnpm exec` aborted its workspace safety check; direct local binaries ran successfully.
- The coordinator reported actual local HTTP proof of name conflict handling, current-password and password-change behavior, both secure email confirmation legs, and cross-tab sign-out checks, including cleared old email inputs/drafts. A 320px browser capture exposed the Account heading layout issue fixed here; the root session will recheck the capture after its local build.

## Remaining gates

Coordinator to complete the final 320px browser capture and fresh review before accepting TASK-030. Hosted Auth confirmation configuration remains unverified.

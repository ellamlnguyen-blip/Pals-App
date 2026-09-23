# TASK-015 final handoff — local Notifications inbox and preferences

Date: 2026-09-23
Status: complete for the bounded disposable-local increment under Accepted ADR-0017.

## Outcome

The private notification ledger, category preferences and owner-only bounded inbox/mark-read RPCs were implemented in TASK-015A. Authoritative friendship and DM transitions emit minimal optional local items. TASK-015B added source-owned Hangout edit/cancellation, host activity and Hangout-chat items with current-source revocation and source-gate race protection. TASK-015C added the local-only Notifications tab, one 24-item page at a time, neutral unavailable rows, allowlisted destination links, no-store API/page responses, and transition-safe content masking. No unread badge, content feed, message preview, or public activity score was added.

## Evidence and review

- Each stage contract was independently reviewed and published before dispatch. A and B passed independent exact-tip security reviews after local SQL, real Auth/HTTP and race checks. B's first source-gate race finding was corrected and retested before integration.
- C passed `pnpm check`, real signed-in HTTP and coordinator rendered 390px phone, 768px tablet, 1024px desktop, keyboard, paging, read/preference, loading/empty/error/retry/denial, signout/account-switch/history, source revocation and uncertain write checks. Its first review found an evidence gap for two POST failures; the gap was closed, and a fresh exact-tip security/design review cleared integration. See `TASK-015A.md`, `TASK-015A-REVIEW.md`, `TASK-015B.md`, `TASK-015B-REVIEW.md`, `TASK-015C.md` and `TASK-015C-REVIEW.md` for exact tests and limits.
- Reviewed task tips: A `b9681f1a1bcfb5bdaa62329436c8cd3935dd9fd1`, B `1152540222c121dcfb1b41dfad5952e19ceef921`, C `29abd1bb4174fb4f42bf06b3f47929f01c48f462`. The coordinator independently verified each live task ref before main integration.

## Remaining boundary

All notification and related local gates were restored false, disposable users/records removed and local web/Supabase/VM stopped. No hosted migration/deployment, Realtime, push/email, background reminder, global blocking/reporting, co-host notification policy or launch readiness is claimed. TASK-010/ADR-0012 and TASK-016 safety work remain separate. An instrumented in-flight inbox response crossing account switch was not observed in a real browser; code revision/actor guards and focused transition tests cover it.

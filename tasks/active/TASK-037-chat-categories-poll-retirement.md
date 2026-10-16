# TASK-037 — Categorized chats and poll retirement

Status: active. Ella's 2026-10-16 correction to the TASK-036 preview explicitly requests Hangouts and direct messages in separate tabs like the supplied image, removal of the visible Chats heading on that screen, removal of the poll feature, and navigation to Hangout details by clicking the Hangout name. Canonical baseline is main `8d748483af65cb78d79aab120628354e1613c788`; exact local UI dependency is `agent/TASK-036-chat-reference-ui` at `1fac4f67a8cd8b57140eff60eaf8ba2c3923b7c7`. TASK-032/033/034/035/036 parent gates remain open. No hosted operation or app-main integration is in scope.

## Outcome and bounds

- Keep the rounded desktop split pane and mobile list/thread navigation from TASK-036. Render accessible Hangouts and Messages tabs above the sidebar list; each shows only that category. Incoming message requests remain reachable from the Messages tab. Category paging must not silently omit items from the current authorized combined source snapshot or claim a global count from a page-local result. Preserve unread indicators and source activity order within each category.
- Make the user-selected Chats heading visually absent on the index and thread routes while retaining one accessible page heading. Use the sample image for layout and interaction, but never copy its illustrative faces, messages, times or counts into the product.
- Remove poll controls from Hangout and direct threads and remove the web `/api/polls` surface. Retire authenticated poll RPC execution with an additive migration; retain existing private poll rows for audit and future retention review. Do not rewrite old migrations or delete user data. ADR-0044 records the user-directed supersession of ADR-0042's poll clause.
- Replace the Hangout detail strip's text action with a link on the Hangout name in the thread header. Keep the actual time/public place strip. Preserve chat/send/request/safety access checks, retries, revocation behavior and all unrelated notification/co-host features.

## Verification

Implement on a fresh bounded branch from current `origin/main` plus the exact reviewed TASK-036 dependency. Check category switching, source-bound cursor behavior including mixed and empty category pages, request access, selected row, title link, no poll UI/API/RPC access, build/TypeScript, relevant automated tests and real 1280/375px browser renders without horizontal overflow. Use only the named disposable local database for any migration apply/test. Record migration/privacy review, screenshots, handoff, task-branch remote SHA and docs-only main status. Keep application code off main until earlier gates clear.

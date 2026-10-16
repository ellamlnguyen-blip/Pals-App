# TASK-039 — Quiet Chats surface and friendship-only direct messages

Status: active implementation. Ella's 2026-10-16 browser comments ask to remove message requests and redundant chat labels, help and empty copy; use a dot between the Hangout date and time; and require an accepted friendship before direct messaging. The quiet presentation candidate is remotely verified on TASK-039A at `98327d14d6b35f333ed4afe64ac663427ca0bd5c`. ADR-0045 was explicitly accepted for local implementation on 2026-10-16. TASK-032/033/034/035/036/037/038 application-main and release gates remain open; no hosted operation is authorized.

## Split and dependency order

- **039A, presentation:** implement the independently authorized visual cleanup on the exact TASK-038 local app source. Keep existing message-request controls and safety-critical states until the friendship-only policy is accepted and enforced; do not make a visual removal imply a server policy change. See [039A](TASK-039A-quiet-chat-ui.md).
- **039B, server policy:** [ADR-0045](../../decisions/ADR-0045-friendship-only-direct-messaging.md) is Accepted. Implement and review the additive database migration and authorization/RPC/notification projection changes against the exact 039A source. Do not enable a request-free student UI until server policy tests and fresh security review pass. See [039B](TASK-039B-friendship-only-dm.md).
- **039C, web/API:** after reviewed B, retire old request/allow web routes and request-specific student UI. Verify actual friend/nonfriend and retained-state transitions with two accounts, then publish a task handoff and reviewed status. See [039C](TASK-039C-friendship-dm-web.md). Keep unfinished application source on task branches while predecessor gates remain open.

## User-visible result

Chats retains Hangouts and Messages category tabs, authorized current ordering, unread dots, responsive split pane and title navigation. Conversation rows show name and image/emoji without the redundant “Hangout” or “Direct chat” subtitle. Thread headers show only avatar and name. The Hangout detail strip reads date **·** time **·** public place. The composer has an accessible name but no visible “Message” heading or persistent instructional paragraph. An empty thread is visually empty, without a large placeholder card or duplicate “No messages yet” line. Loading, denial, error, send outcomes and safety controls must still be perceivable when actionable.

After server policy enforcement and 039C web work, only current accepted friends may start, read or send a direct conversation. There is no Message requests cue, pending-request inbox, request acceptance/reply/withdraw path, or independent DM consent button in the student surface. Former request-only conversations are handled per accepted ADR-0045; no historical text is deleted or exposed through a new generation.

## Verification and publication

Read AGENTS, this contract, relevant product/authorization/messaging docs, design direction, shared tokens and installed design skill; attempt the live `usepals.com` reference. Review the exact app source dependency. For A, build/TypeScript and render Hangout and direct routes at 811px and phone width, including empty, loading, error and actionable states; verify accessible controls and no overflow. For B, require the accepted ADR, committed additive migration and focused RPC/RLS/notification/retry/concurrency tests on the named disposable local environment, plus fresh security review. For C, require web/API and two-account browser denial/allowance checks. Record screenshots and handoffs. Publish task branches, independently verify remote SHAs, and update docs-only canonical main status. No application-main or hosted integration until earlier gates close.

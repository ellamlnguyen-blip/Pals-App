# Standing automatic next-task instruction

Date: 2026-09-22
Branch: `agent/TASK-010-auto-next-policy`
Scope: documentation-only coordinator update requested explicitly by the user.

## Outcome
User instructed: “from here on out, after a task is finished, i want you to automatically make a new chat and start the next task”. Saved this in AGENTS.md as the standing Pals project workflow, superseding older no-auto-dispatch wording. Completion still requires review, handoff and verified main integration; Proposed ADRs and safety gates remain explicit. Prevent duplicate successor chats and distinguish parent-task completion from documentation receipts/sub-stages.

## Verification and remaining state
Coordinator reviewed the bounded documentation diff and ran whitespace checks. No runtime changes or tests. TASK-010 remains blocked on Proposed ADR-0012 acceptance; the prior user request already initiated creation of the TASK-011 chat, so this policy update does not create a duplicate. Publish the policy branch, integrate canonical main and verify remote refs; report the final SHA in the conversation.

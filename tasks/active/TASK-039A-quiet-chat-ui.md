# TASK-039A — Remove redundant Chats copy

Status: ready for bounded local implementation after this contract is published on canonical main. Start a fresh task worktree from current `origin/main`, merge only the exact reviewed TASK-038 source `f04a4a39eda28718e06ac316a28af92f226e188a`, and verify the merge. Do not edit the user's existing checkout or another task worktree.

## Scope

Remove the selected “Messages”/“Hangout chat” eyebrow text in thread headers, row subtitles for both categories, visible composer label and permanent instructional/disclosure paragraph, duplicate idle status, and large no-message card. Preserve native headings/landmarks, accessible textarea name and send state announcements, loading/denial/error/actionable feedback, request controls pending 039B, safety actions, current title and photo/emoji access masking, unread dots, paging and selection. Keep the direct thread's actionable paused/opt-out explanation: Accepted ADR-0016 requires the UI to distinguish a paused thread from an ended one. Move the Hangout history/block explanation from permanent text to a compact, keyboard-accessible “Chat privacy” disclosure opened on demand; do not remove the information entirely. Use an en-US New York date and time formatter that separates date from time with a middle dot and leaves the public-place dot intact. Do not change the stored timestamp or time-zone semantics.

The reference screenshot shows a quiet, open message pane. Preserve its existing pale blue/white tokens, borders, split-pane proportions and phone list/thread routing. Do not add new dummy messages or profile photos. Keep the existing friend/request DM behavior working until a separate accepted policy changes it.

## Acceptance

Focused source/formatter checks, production web build/TypeScript, authenticated Hangout and direct route renders at the reported 811px viewport and 375px phone, no horizontal overflow, accessible labels and live status, title and category navigation, request access while the old policy remains, and a handoff. Publication and integration follow AGENTS; no hosted work.

# TASK-015B independent security and evidence review

Date: 2026-09-23
Reviewed branch: `agent/TASK-015B-hangout-events`
Final exact tip, live remote verified: `1152540222c121dcfb1b41dfad5952e19ceef921`
Published contract baseline: `bdb811956f10d8a0576d995da2b2da8f12eff112`

## Review sequence and conclusion
The first pushed tip `c54650a3cc52c71e683907952b0ebd1cc60e9ad1` was blocked by an independent exact-tip security review: Hangout edit/cancel/join/leave could insert a notification after a concurrently committed Hangout source-gate disable. The reviewer also required mixed social/Hangout cursor evidence. That code was not integrated.

The same bounded agent corrected the emitter to lock and freshly recheck the Hangout gate after the parent source lock, before notification gate and recipient locks. Chat events also recheck their source gate. It added observed both-order gate races and mixed-source pagination. A fresh GPT-6 Sol medium read-only reviewer verified the new remote SHA and exact diff, found no blocking grant, event identity, recipient or projection issue, and cleared integration. The reviewer did not restart the stopped disposable stack; the implementation handoff records the executed tests.

## Verified boundary
Material public/private detail changes, essential cancellation under mute, joined-only fan-out, host-only generic join/leave, and chat messages use server-owned event identities and no copied sensitive content. Current source access is rechecked per event code, and revoked rows project neutral. The source-gate race is closed in both observed commit orders. All existing local gates remain default off. This review does not authorize hosted delivery, Realtime, global blocking/reporting or co-host behavior.

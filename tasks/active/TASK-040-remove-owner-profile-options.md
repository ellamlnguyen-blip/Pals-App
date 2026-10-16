# TASK-040 — Remove owner Profile options menu

Status: ready for bounded local presentation implementation after this contract is published on canonical main. Start a fresh task worktree from current canonical main plus exact reviewed local TASK-039C source `8ceca20fdcc017e9aad4ede1bb000846744824f4`; record the merge SHA before editing. TASK-039/ADR-0046 are independent and remain open.

## User request and scope

On the signed-in owner's `/profile` screen, remove the top-right `Profile options` ellipsis and its whole popover, including Profile sharing and its explanatory text/links. Preserve the back action and primary Edit profile action and the displayed profile content. Do not remove the peer-profile options menu, where report/block safety actions remain. Do not delete or alter the underlying `/people/privacy`, `/notifications`, `/safety`, or account routes or their authorization. Their existing entry points on Pals, the header, and the owner footer remain.

Use the shared `ProfileTopbar` with an explicit or content-driven owner omission so the peer route keeps its current menu. Remove now-unused owner-only popup props/imports and CSS only where safe; avoid product/schema/API changes. Preserve keyboard focus order and accessible names. At 811px and 375px, the back and Edit profile controls should remain reachable, the removed menu should leave no blank trigger or horizontal overflow, and peer report/block should remain accessible. Build/TypeScript and focused rendered QA are required; a simple reversible presentation change needs no mirror test.

## Handoff and gates

Record source SHA, build/render evidence, any preview limitation, and remaining predecessor gates in a handoff. Commit, push the task branch to configured origin and independently verify remote SHA. This task does not accept ADR-0046 or integrate earlier application branches into canonical main. The coordinator publishes a reviewed status-only main receipt; the parent remains incomplete until accepted predecessor integration.

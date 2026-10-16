# TASK-039C web/API handoff — friendship-only direct messages

Status: bounded source candidate ready for independent review. TASK-039C and parent TASK-039 remain incomplete pending migrated two-account browser verification, predecessor release gates, accepted-environment persistence and coordinator integration.

## Source and scope

- Branch: `agent/TASK-039C-friendship-dm-web` in `/private/tmp/pals-task039c-web`.
- Exact baseline: `f375526c4789fcfe76d96d3797c489de5167f8d2` on canonical main, including the fresh-reviewed TASK-039B source `1692e91edf1b641843909f8bd18cb02924c36c52` and Accepted ADR-0045.
- The web/API now rejects `mode=request` and the `accept`, `reply`, `ignore`, `withdraw`, `friend_send` and `allow_dm` thread actions. First send uses `send_friend_dm_message` only after a current friendship precheck; its RPC remains authoritative under the shared locks. Existing send and close remain generation-bound.
- Chats removes the Message requests cue/count and unused request inbox. Attention parsing rejects pending DM rows. People offers first message or Open chat only with the current friendship state returned for that profile, and no independent DM consent or request composer. Direct thread shows only accepted generations, preserves close and safety actions, and clears identity, text and draft on lost access or stale URL. Its API repeats the current generation check after reading messages and rechecks the actor before response. Old request/accept notification events have no client destination; server projection neutralizes retained historical items.
- Hangout chat and other categories are unchanged. No schema, migration, hosted resource or canonical main edit is included.

## Independent review follow-up

A fresh reviewer identified two P2 issues in the first published candidate. First, a stale/conflict POST response after friendship teardown left the prior peer and message bodies visible while showing only a note. Direct mutation failures now conceal peer, bodies and draft before reauthorization; stale/conflict also discard the old retry and never leave the old generation visible. The same concealment applies to uncertain and transport failures. Second, retired direct URLs lost their report action because the page gated safety controls on current `get_dm_status`. The direct page now keeps SafetyActions for any valid signed-in direct URL. `submit_safety_report` authorizes the known target through retained peer evidence or current People visibility on the server; no retired DM text or peer name is requested. A second review confirmed those two fixes but found that the neutral forms misleadingly described every valid UUID route as an existing conversation and hid the exact target of an irreversible block. The forms now display the exact account ID from the URL for truthful block confirmation and report targeting. No peer name, image or retained message body is added to the unavailable view. The source remains subject to fresh exact-tip review and migrated two-account browser QA.

## Verification

- `./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit`: passed.
- Webpack production build, `node node_modules/next/dist/bin/next build --webpack` from `apps/web`: passed. Turbopack could not follow the external read-only dependency symlink, so webpack was used. Dependencies came from the already verified TASK-039A local worktree; registry access was unavailable.
- Focused `combined-projection` and `notification-destination` source tests: 8 passed, including pending DM attention rejection and retired request notification destinations.
- ESLint on changed TypeScript source: passed with zero warnings. `git diff --check`: passed. The review follow-up repeated TypeScript, touched-source ESLint and the 8 focused tests; the final webpack build was rerun on the follow-up source.
- Live `https://usepals.com/` reference was attempted but inaccessible from the available web tool. Checked-in design direction, shared tokens and existing UI supplied the visual baseline.

## Remaining verification and gates

- No 811px/375px rendered candidate screenshots or actual two-account friend/nonfriend browser flow is claimed. The separately migrated `pals_task039b` database is a schema-only SQL fixture target without a two-account GoTrue/API browser stack. The active 3035 preview database and runtime were deliberately untouched; coordinator will arrange a backup, review and local migration before browser QA.
- Browser QA must cover first friend send, current friend history, pending/declined denial, unfriend/refriend new generation, block, People opt-out, old direct URLs and old notifications, plus loading/error/empty layout and composer accessibility at 811px and 375px.
- Fresh independent source review, accepted-environment backend persistence, predecessor gates, application-main integration and hosted operation remain coordinator-owned. This handoff records source work only, not TASK-039 completion.

Initial implementation commit and independently verified origin SHA: `b505b1f4f9c668319017a55043f7f5df121f6987`; initial handoff receipt SHA: `df17dfcd1d679729173a81539b01a7d656b60237`. Review follow-up implementation commit and independently verified origin SHA: `b5704bfb7f96881590454ced30321fb818997e79`. A later review identified the misleading arbitrary-UUID safety label; its correction and independently verified origin SHA is `bfb3e6a623f2736dd18520ca22a37dfb51ba56b8`. This documentation receipt follows that source commit.

# TASK-033 local implementation and verification

Status: reviewed local candidate ready for Ella’s finalization/sign-off. Application task branch `agent/TASK-033-chat-notifications` is independently remote verified at `d8eef34f227c5c04f6132a7744e6b9278be418fc`. No application-main integration or hosted changes. TASK-032/033 remain incomplete behind Ella's concrete candidate finalization/sign-off and existing release gates.

## Delivered

Combined Chats rows include DMs/requests and authorized Hangouts with peer name/protected circular photo (initial fallback), title/activity emoji and whole-row navigation. Visible Your chats and Notifications Inbox headings are removed. The list uses bounded source-creation batches, not latest-message ordering. Joining immediately grants existing source-authorized chat, without a second enrollment.

Accepted ADR-0042 implementation adds friendship-origin DMs with independent consent provenance, current-consent reads/sends/retries; single-choice polls in eligible Hangout and accepted DM conversations; co-host invitation accept/decline and host management; durable one-hour reminders and three default-off independent activity settings. Private tables have no student direct grants. No Realtime, push/email or provider change.

## Reviewed source and local verification

Fresh bounded security reviewers covered each backend and web stage. Corrections included DM retry/denial masking, co-host lost-response and identity masking, poll superseded vote/closed-source reconciliation, preference save/wake races, notification job budget/fairness/locking/schedule revision and an additive identity-trigger repair caught by real Auth confirmation. Source original migrations were not rewritten.

Only named disposable `supabase_db_pals-task029-disposable` received committed migrations 20261015000100 through 00700. Transactional SQL checks: D2 26, E 33, C 56, FG 43, D2U 8, EU 15, E007 10 (191 total), plus observed concurrency harnesses for DMs, invitations, polls and jobs. These focused checks are not a whole historical-suite pass; old immediate-promotion expectations are superseded. Final production webpack build and full web TypeScript passed. Four new helper tests passed; source ESLint could not finish with the existing linked dependency setup and runtime clone lacks an ESLint binary, so no new lint pass is claimed.

Real Auth/browser verifies friendship acceptance and decline, co-host acceptance and decline, join→chat→send, Hangout poll create/peer vote/own vote/change/close, accepted DM send and poll creation, friendship removal hiding all bodies/polls, explicit independent consent restoring them, settings saved and reloaded with fresh Auth preserving old four preferences. Caller-bound poll HTTP returns private/no-store200 for owner and403 for signed-out/wrong-actor. New activity and reminder notification destinations appeared in the actual inbox. Friend acceptance, host join and chat-message codes appeared in the synthetic peer's authorized projection. Desktop and375px layouts have one main landmark and no horizontal overflow. Poll closed state survived reload; leaving revoked poll HTTP and message reads. Fresh cross-stage review of exact d8eef34 found no blocker. The three new synthetic Hangouts were cancelled, their DM closed, their profiles opted out, and only the three test-enabled preferences restored off; original four preferences and all existing student profiles/relationships/Hangouts remain unchanged. Private synthetic evidence is retained; no reset or broad deletion.

Real scheduled pg_cron job1 runs21 and22 succeeded: first persisted one due reminder for the joined synthetic recipient, second retained count1. No manual worker call or browser-triggered generation; dedicated cron fixture cleanup verified zero rows. Evidence is retained separately.

## Remaining

Local verification, cleanup and final source review passed. Durable evidence: `docs/ux/evidence/task033-local` (browser screenshots, caller-bound API/persistence/cleanup checks and real cron receipt). Canonical documentation publication receipt follows remote verification. Application-main and hosted migrations/deployment still await Ella’s finalization/sign-off; other release gates remain. No successor task is dispatched for a sub-stage. Tool could not configure or verify Standard speed; agents used GPT-6 Sol medium.

## Review record

Fresh final reviewer `final_integration_review_033` inspected exact d8eef34 and found no concrete cross-stage blocker in friendship DM/poll consent, co-host source/revision/action integration, independent persisted settings and scheduled reminder projection. Earlier poll and settings findings received narrow passing re-reviews. Review was read-only; hosted persistence was not claimed.

## Practical limits

Combined inbox pages use source creation, not latest-message order, with source-keyset paging. More-than24-source paging and deterministic browser response-loss/account-switch timing were not newly exercised end-to-end; bounded helpers, source review and backend race tests cover their logic. Realtime, push and email are excluded. Reminder delivery is the next one-minute worker run within the one-hour window and rechecks current membership/source; not an exact wall-clock push guarantee. No fresh whole historical-suite/lint pass is claimed.

## Remote publication receipt

Reviewed application tree `d8eef34f227c5c04f6132a7744e6b9278be418fc` is unchanged in documentation-synchronized task candidate `c63992dedeaeae83eba1abcce6a3ec1274efb78f`; task branch pushed and independently remote verified. Documentation/evidence outcome `6e0f09e4ca15e40026dc4a4e21db4b623655f67d` and documentation-only canonical main `7acb3f6cbfe73cae21637c264166bc508353e006` were pushed and independently remote verified. This receipt and final cleaned inbox/settings screenshots follow that verified outcome. No application code was integrated into main, no hosted operation occurred, and TASK-032/033 remain incomplete pending finalization/sign-off and remaining release gates. The preview at localhost3035 remains on the final built candidate.

# TASK-018 — Private attendance confirmation handoff

Status: Complete for the bounded disposable-local scope after reviewed A/B stages and verified canonical main integration.
Policy: Accepted ADR-0022 on 2026-09-24.
Parent contract: `tasks/active/TASK-018-attendance-confirmation.md`.

## Outcome

Stage A adds a private default-off attendance gate, caller-owned self-report relation, exact/list/write RPCs and database schedule freeze at attendance opening. Stage B adds a local-only `/attendance` owner page, actor-bound no-store API and small Calendar/account entries. The UI shows only the retained Hangout ID and own answer unless ordinary source authorization separately permits detail; this implementation deliberately remains ID-only. A join never becomes proof of attendance. The 30-day correction rule, expected revision and lost-response recovery are enforced by the database and reflected in the UI. Reporting stays a separate safety action.

## Evidence

- Stage A task tip `249efcc4214656a32beba49c13eb479b9e0c614b` passed fresh exact-tip security review and is on independently remote-verified main `3cbf239b20098e49c58c5f3e50680bd0ac51fb41`. Its handoff records 16 local SQL suites, 65 attendance assertions, 21 two-session outcomes, local PostgREST/Auth, schema lint, full workspace checks and limits.
- Stage B task tip `2c589da0d323ca2feeda6d9ce0bf11ace9b2324d` is independently remote-verified and passed fresh exact-tip design/security review with no P0/P1/P2 finding. Its handoff records full workspace checks, authenticated local API and rendered light desktop/tablet/phone/320px, dark phone, keyboard/focus, source-gate-off, denial, unknown-result/recovery and real stale-revision checks. Closed-unanswered and moderation-disabled source were not separately rendered; their backend authorization paths were tested in Stage A and the UI branches were reviewed.
- After the final local QA, zero disposable Auth users, Hangouts and attendance answers remained; all nine local feature gates were false and the proxy, browser, production web server, Supabase and Lima VM were stopped.

## Boundaries and remaining work

The local pgTAP wrapper could not mount the isolated backend checkout, so Stage A ran all SQL suites directly in the disposable Postgres container. Its HTTP attendance tests used locally signed JWTs separately from the real Auth regression. Stage B adds no notification, peer result, analytics event, report mutation or hosted operation. No gate was enabled by default. Production retention, hosted rollout and the separate TASK-019 instrumentation contract remain open. See `agents/handoffs/TASK-018A.md` and `TASK-018B.md` for exact checks and limits.

## Publication receipt

Stage B task branch `agent/TASK-018B-attendance-ui` and remote SHA `2c589da0d323ca2feeda6d9ce0bf11ace9b2324d` were independently verified. The reviewed parent implementation and this handoff reached independently verified canonical main `b6d0d054dab901574a6cd06b07372fae3f5013ad`; both remote SHAs were checked together. The final completion receipt records this integration and shared task status on main. No hosted or default-on release is implied.

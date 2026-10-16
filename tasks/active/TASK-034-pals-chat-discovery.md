# TASK-034 — Pals discovery and chat attention

Status: active bounded follow-on requested by Ella on 2026-10-15. Canonical documentation baseline fb3c976730e8a397d82b56b42b4c1b582555a15b. Local application dependency c63992dedeaeae83eba1abcce6a3ec1274efb78f (reviewed TASK-033 plus prior TASK-032 source); these parents remain incomplete behind existing finalization/sign-off and application-main/release gates. Fresh branch agent/TASK-034-pals-chat-discovery starts from canonical main then explicitly includes this dependency. No hosted changes are authorized.

## Requested outcome

- Each currently authorized chat row indicates unread incoming messages. Combined inbox sorts all current conversations by latest authorized message or owner last use, descending, rather than source creation batches.
- Rename the People feature to Pals throughout student-facing UI, preserving internal routes and database identifiers. Discovery heading: Discover your next Pal!
- Remove the separate Your friendships entry/page flow. Current friends have a small heart by the name; pending outgoing requests have a distinct clock symbol. Incoming request actions remain in Notifications/profile. Existing profile friendship controls preserve cancel/unfriend and current consent.
- Discovery filters only major and graduation year; no name search. Rank currently visible same-campus profiles by similarity to the owner's saved interests, graduation year, hometown and major; filters constrain the full eligible result set before ranking/pagination. No external AI, behavioral tracking or new profile collection.

## Stages and gates

A: authorized existing-data presentation only, in its published bounded contract. No schema/major permission changes.
B: fresh task-specific read-only schema/behavior audit and concrete Proposed ADR-0043 for unread/read/use metadata, globally recent inbox pagination and profile-similarity browse. Include privacy/revocation/cursor and migration/tests contracts. AGENTS requires explicit acceptance of major schema/domain/privacy behavior before dependent implementation; prepare and review the exact proposal first. Existing current request authorizes intent and independent A, not acceptance of a not-yet-written ADR.
C/D: bounded backend implementation after acceptance and fresh source review, then dependent UI integration with rendered and real persistence/denial/race checks. Publish contracts before dispatch. Coordinator owns shared records, git and integration.

All stage agents use fresh limited context, GPT-6 Sol medium; tool cannot set or verify Standard speed. Do not edit original dirty checkout, alter existing fixtures/gates, reset backend, deploy, change providers, expose credentials, or rewrite applied migrations. Named disposable Supabase only after committed migrations reviewed. Every stage produces a handoff; parent completion requires finalization, accepted application-main integration and remote verification under existing gates. No successor for sub-stages.

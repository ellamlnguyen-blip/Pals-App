# TASK-017A moderation/safety lock review
Date: 2026-09-24
Branch: `agent/TASK-017A-revision-integration`

## Finding

An independent draft-code security reviewer found two concrete deadlock cycles in the first Stage A lock plan: a current Hangout report can hold a Hangout parent then wait for an operator account while moderation held that account exclusively then waited for the parent; a safety block can hold a Hangout then seek an account while a mixed moderation queue held that account exclusively then waited for the Hangout. The moderation-only advisory lock does not cover existing TASK-016 safety writers.

## Reviewed correction

The Stage A contract now requires shared operator account/role and read-only queue/detail target locks, with an exclusive user-target account lock only for a case transition's fresh negative platform-role check. The independent reviewer found no remaining concrete cycle against current safety/reporting paths under this matrix, and rechecked the exact contract wording after a target-role scope correction. The implementation agent is applying it and adding observed overlap tests. No new authority or hosted operation is introduced; test and exact-tip code review remain required.

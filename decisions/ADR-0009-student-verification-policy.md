# ADR-0009 — Student verification evidence
Status: Proposed
Date: 2026-09-21

## Decision requiring explicit acceptance
The product requires verified UNC students. Confirmed university email does not establish current enrollment. Choose whether MVP campus verification requires confirmed email plus a completed student profile, or separately checked enrollment evidence. Approve the exact deliverable email-domain allowlist and what the badge communicates alongside that choice. Research: `docs/research/UNC_EMAIL_VERIFICATION.md`.

## Pending recommendation
Keep email confirmation (Supabase Auth), campus verification (server-controlled membership), structural profile completeness, and account suspension independent. TASK-002 implements these separations already required by its contract but does not automate campus verification or populate a domain allowlist. Local tests set synthetic membership explicitly as the database owner.

## Consequences while pending
No production eligibility policy, verified badge semantics, membership-granting endpoint, or enrollment evidence storage is implemented. `allowed_email_domains` is empty. The foundation helper requires both confirmed email and explicit verified membership, and rejects suspended/banned accounts and inactive campuses. Completing a profile never grants verification.

No decision in this proposal has been accepted by the implementation agent.

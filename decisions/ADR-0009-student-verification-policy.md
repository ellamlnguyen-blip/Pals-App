# ADR-0009 — Student verification evidence
Status: Accepted
Date: 2026-09-22

## Decision
The user explicitly selected Option A: MVP access requires confirmed approved UNC email plus a completed required profile. No separate enrollment evidence workflow is required for MVP. On 2026-09-22 the user approved these exact domains:

- `live.unc.edu`
- `unc.edu`
- `ad.unc.edu`
- `business.unc.edu`
- `kenan-flagler.unc.edu`

Compare normalized domains by equality, never arbitrary subdomains or suffix matches. Every user must actually confirm email ownership. Approval of a domain does not assert that every address receives mail. Research: `docs/research/UNC_EMAIL_VERIFICATION.md`.

## Implementation
Keep email confirmation (Supabase Auth), campus verification (server-controlled membership), profile completeness, and account suspension independent. TASK-003 may implement trusted membership assignment from current confirmed Auth email and the approved server-controlled allowlist. Clients cannot supply trusted confirmation state, verification or platform roles. Email changes must invalidate old evidence. Suspended/banned accounts and inactive campuses fail closed. Required profile completion includes a permitted primary photo.

## Consequences
Verification means confirmed approved UNC email, not independently proven current enrollment. User-facing verification wording must reflect this. Some approved domains may also be used by non-students; this is the accepted MVP email-based model. No enrollment document collection/review is introduced. Profile completion by itself never grants campus verification.

This record reflects the user's explicit acceptance of Option A and the exact allowlist.

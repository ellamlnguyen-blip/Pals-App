# ADR-0036 — Explicitly opt-in rich peer profiles

Status: Accepted
Date: 2026-10-06
Related: TASK-028P; ADR-0011, ADR-0013, ADR-0016, ADR-0025, ADR-0030.

## Context

The user requests all Pals profile pages to follow a supplied design with photos, hometown, bio, academic details, friendship/message actions, a four-photo gallery and three conversation prompts. Current People consent exposes only a bounded text allowlist. Existing profile photos and prompt answers are owner-private. Owner-only hometown is now stored under Accepted ADR-0037. The request establishes the intended product experience; this decision makes the new disclosure and delivery rules explicit before implementation.

## Decision

1. Preserve existing People text opt-in and eligibility. Rich presentation adds a distinct, plainly worded owner choice: **Share my photos, hometown and conversation prompts with people who have confirmed approved UNC email addresses at my campus.** Default off for every account, including existing People opt-ins. Show an accurate preview before the owner turns it on, explaining that future edits to these fields and replacements in the selected photo slots are also shared while this choice remains on. An active owner can turn rich sharing off even when People or rich gates are disabled, source eligibility is lost, or profile fields/photos are incomplete. Turning People sharing off clears rich consent; later People re-opt-in does not restore it without a fresh rich opt-in. Turning rich sharing off preserves owner editing while denying future rich peer reads.
2. Viewers and subjects must have active accounts, live confirmed Auth email on the exact approved UNC domain allowlist, current membership in the same active campus, People opt-in, enabled capability/source gates and no either-direction block. Under ADR-0030, missing or incomplete profile fields/photos never deny app or source access; missing rich content simply renders empty. Existing People text projection continues to require its current text publishability rules and consent; this is not a new complete-profile/photo access requirement. Friendship grants no extra access. No anonymous, cross-campus or search-engine access. Keep incomplete-profile app access unchanged.
3. The rich peer allowlist adds the currently selected primary photo, up to four extra photos, up to three owner-authored question/answer pairs and optional self-declared hometown (plain text, at most 100 Unicode characters; never inferred from GPS, IP or another source). Existing name/campus/year/major/bio/interests/down-to-do keep their current text policy. Other private fields, actual email, Storage paths, favorite music/foods, weird fact and Instagram remain private.
4. Display **UNC email verified** only when the current server authorization establishes that exact claim. Never imply verified current enrollment, safety approval or a verified hometown; never expose the email address.
5. Keep original profile/Storage owner-only policies. Deliver peer photos through an authenticated, narrowly authorized server gateway using opaque current slots and revisions, fresh caller/subject/block/consent/source checks and bounded image decoding/re-encoding to remove metadata. Do not issue public or signed bearer URLs. All outcomes use private/no-store caching. A separate reviewed implementation contract must specify server credentials/grants, exact RPC/route boundaries, safe image limits and lock/race behavior before migration/code execution.
6. Opt-out, block, sanctions, Auth/campus/account eligibility loss, capability/source closure and reference replacement/removal deny subsequent requests. A request already authorized before a change may finish under existing statement-snapshot semantics. Already delivered bytes/screenshots cannot be recalled; tell users this accurately. A stale slot/revision must not fetch a different newly selected photo.
7. Add friend uses the existing authoritative friendship state machine. Say hi uses the existing recipient-consent DM request flow; no automatic acceptance or notification claims. Keep report/block available without exposing otherwise hidden profile data.
8. Schema/permission changes are committed migrations with automated denial/revocation/race tests and independent security review. This decision authorizes a bounded disposable-local implementation after acceptance; it does not authorize hosted migration, gate activation, credentials publication, production launch or domain changes.

## Consequences

The owner can see and edit the complete reference layout now. Peers receive the complete rich layout only after the new sharing choice and current authorization pass. Existing users retain their previous disclosure boundary. Optional blank sections are omitted or shown honestly to the owner; no generated personal content is inserted into real accounts. This supersedes ADR-0025's PEER-PRESENTATION timing deferral only for the accepted bounded implementation, preserving its other deferrals and all launch gates.

## Acceptance

Accepted 2026-10-06 by the user's explicit ‘yes’ to: ‘Approve default-off opt-in sharing for verified UNC students at the same campus?’ Acceptance authorizes only the bounded disposable-local implementation described above; hosted operations and canonical application integration retain their existing gates.

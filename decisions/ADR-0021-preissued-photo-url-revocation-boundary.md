# ADR-0021 — Preissued photo URL boundary after account sanction
Status: Accepted — disposable-local TASK-017B1 only
Date: 2026-09-24

## Context

Accepted ADR-0019 says a suspended or banned account loses all student feature access except its existing own-status view. TASK-017B1 must enforce that across authenticated database, app and Storage operations. The accepted onboarding authorization document also notes that a normal Supabase Storage signed URL is a bearer URL. It is issued while the owner is authorized, then can be used without a fresh account-status check until it expires. Database RLS and the app's live photo route cannot retroactively revoke a URL already issued to a browser or another holder. A signed URL may have been shared before a sanction. [Supabase's Storage guide](https://supabase.com/docs/guides/storage/serving/downloads) confirms that signed URLs remain valid until expiry regardless of Auth key changes; its [CDN guide](https://supabase.com/docs/guides/storage/cdn/smart-cdn) warns that a cached response may remain available beyond token expiry on hosted Smart CDN.

The independent B1 contract review identified this as a policy gap. Treating a post-sanction owner Storage denial as proof that every earlier bearer URL stopped working would make an inaccurate safety claim.

## Proposed decision

For disposable-local TASK-017B1, interpret the immediate sanction guarantee as revocation of **new authenticated student access**. A committed suspension or ban immediately denies the subject's new app photo reads, authenticated Storage reads and creation of new signed URLs, along with all other student feature requests, while retaining the own-status view. A signed photo URL issued before the sanction remains a bearer capability until its encoded expiration, which may be long; anyone holding it may still retrieve that one object during that period. Hosted CDN caching may extend this exposure beyond token expiry and is not covered by B1. Reinstatement does not restore deleted relationships, participation or messages.

B1 must test both sides with actual local Auth/Storage: denial of new owner requests after sanction and the behavior of a preissued URL through expiry. The handoff and UI must not claim that already shared photo URLs are immediately revoked. The photo remains private in Storage and gains no new public reader, operator browse permission or longer URL lifetime from this decision. No hosted use is authorized.

If immediate revocation of every preissued photo URL is required before hosted moderation, design and independently review a separate object/key revocation and retention mechanism. Do not erase evidence, rotate shared signing material, or silently broaden service-role access as an implementation shortcut. Hosted photo URL lifetime, sharing controls and incident response remain launch decisions.

## Consequences

The immediate account-status guarantee remains enforceable for requests that consult live authorization. Preissued bearer URLs may have a long post-sanction exposure; B1 records the actual local behavior instead of claiming a stronger guarantee. This amends only ADR-0019's photo-access interpretation, not its case binding, audit, role, conflict or other sanction rules.

## Alternatives

- Claim immediate revocation through RLS alone: RLS is not checked when a previously issued bearer URL is redeemed.
- Delete the referenced object at sanction: may destroy or complicate retained evidence and changes the accepted no-deletion approach.
- Build URL/object revocation in B1: expands a broad cross-source enforcement stage into a new Storage and retention design without an accepted policy.

## Acceptance

The independently reviewed proposal was published on remote-verified canonical main `e084bc2353e20c43667802bd548587c7418ba12c`. The coordinator asked explicitly whether to accept its local enforcement boundary, including continued access through a preissued photo URL and possible hosted cache exposure beyond expiry. The user selected “Accept as written” on 2026-09-24. This accepts the narrow photo-access interpretation for disposable-local TASK-017B1; it does not authorize hosted use, extend the accepted operator reader, or waive any other ADR-0019 rule.

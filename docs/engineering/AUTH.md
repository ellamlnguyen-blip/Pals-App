# Authentication
MVP access requires confirmed approved UNC email and the required profile under Accepted ADR-0009. The exact normalized domains are `live.unc.edu`, `unc.edu`, `ad.unc.edu`, `business.unc.edu`, and `kenan-flagler.unc.edu`. Arbitrary subdomains and suffix matches are denied. “UNC email verified” means email ownership, not independently proven current enrollment.

Authentication answers who the account is. Authorization answers what it may see/change. Do not bury permissions in UI components.

University membership must be modeled so future campuses can be added without redesigning users.

## Implemented flow

`/signup` → email confirmation → `/auth/callback` → `/continue` → `/onboarding` → `/hangouts` (bounded readiness screen). `/signin`, confirmation resend, and signout are implemented. Map and Hangout functionality remain TASK-004 and later.

Supabase SSR uses server-owned HttpOnly, SameSite=Lax cookies (Secure on hosted HTTPS). Proxy refreshes cookies; each protected page/action validates with Auth `getUser()` and the caller-bound `get_access_state()` database RPC. Cookie contents, user metadata and UI state never authorize campus access. All provider calls use a public key and the user session; no service-role key is accepted. Errors deny access rather than using cached profile claims.

Signup and resend use PKCE with an exact configured callback origin. Callbacks exchange the one-time code using the browser's verifier and optional validated `sb_flow_id`; they ignore user-controlled redirect destinations. Open confirmation in the same browser. Expired, reused or cross-browser links return an actionable confirmation screen; a user whose email is already confirmed can sign in with their password.

The database assigns/reconciles membership only from current confirmed Auth email and the active campus allowlist. Email changes revoke or replace evidence; a live check also enforces current allowlist, campus and account status. Unconfirmed and unapproved accounts cannot enter, and suspended/banned accounts are denied even with existing sessions. Required profile fields are name, campus membership, graduation year, major, bio and an existing owned private photo.

Photos use an immutable random object name under the user's UUID, with a 5 MB bucket limit and JPEG/PNG/WebP MIME allowlist. The app checks image signatures, not just supplied filename/MIME. The database rejects missing/foreign photo references. Current photo readers are the active verified owner only; no peers or blanket moderator bypass. App rendering streams the photo through an authenticated no-store route; no public or signed URL is emitted. Owners using the raw Storage API can create bearer signed URLs, which retain their configured expiry; do not introduce them into peer discovery. The upload preserves image metadata; future photo processing/EXIF removal is separate work.

## Configuration and limits

See `LOCAL_SETUP.md`, `apps/web/.env.example`, and `docs/operations/HOSTED_ENVIRONMENT.md`. Hosted email delivery needs a configured SMTP provider for arbitrary UNC recipients. A local mail-catcher success is not hosted delivery evidence. No deployed staging frontend exists yet, so HTTPS staging callback validation remains pending deployment and SMTP. Password recovery, optional profile editing, peer visibility and account moderation UI are outside TASK-003.

## Owner profile editor

TASK-006 adds `/profile` from the Hangouts header avatar. Ready owners can edit required details, clear optional enrichment, replace primary, and add/replace/remove up to four extra private photos. University/email are read-only and the product explains current owner-only visibility. Optional data never gates readiness. Existing onboarding remains for incomplete owners. Live app access checks, signature validation, immutable upload paths and original private image metadata behavior remain unchanged. This local increment does not close TASK-003 hosted HTTPS callback or real UNC delivery acceptance.

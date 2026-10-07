# TASK-028P2 peer UI handoff

Status: peer UI source implemented on `agent/TASK-028P2-rich-profiles` after reviewed PHOTO source `cd7c9bd`. No database/gateway change, runtime activation, browser action or push was performed in this slice.

The People detail page requests `get_rich_people_detail` first. An authorized row supplies its own text, optional hometown, up to five opaque photo slots, three prompt pairs and current UNC-email-verified claim. An absent rich row follows the existing `get_people_detail` text path. A rich RPC error renders a neutral unavailable state and never silently displays a supposed authorized rich profile. Existing friendship, DM request and report/block controls remain in place.

Selected peer photos use only `/people/{subjectId}/photo?slot=...&revision=...` through unoptimized images. Clicking one opens the existing profile-style dialog with **View photo** and Close only; Escape, backdrop and Close restore focus to the trigger. The primary uses the owner reference's hero geometry; extras use its two-column gallery. Missing optional photos, hometown, prompts and interest sections are omitted without fabricated data. The shared `ProfileSummary` renders the self-declared hometown with a map pin when present.

The client clears the whole peer view on a failed photo request and offers a full navigation reload that performs fresh server authorization. It also clears on local/cross-tab auth transition, page hide, hidden document, confirmed block and friend/DM access loss. The clear state contains no prior peer text or image. A request already completed before revocation retains the accepted snapshot limitation; no client cache or bearer photo URL is introduced.

Owned files: `apps/web/app/people/[id]/page.tsx`, `person-view.tsx`, `peer-photo.tsx`, `peer-profile.css`. Shared types, database and gateway files remain owned by their earlier lanes.

Validation: scoped Prettier, ESLint and `git diff --check` pass. Direct installed Next type generation and web `tsc --noEmit` pass. PHOTO real HTTP/barrier tests and coordinator browser QA are separate ongoing gates; this handoff does not claim them. Coordinator should inspect populated/empty/legacy/denied profiles, correct slot images, dialog focus and View-only options, photo error clearing, hometown per subject, friendship/DM/safety actions, and 320/390/793/1280 layouts before integrating.

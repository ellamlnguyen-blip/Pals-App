# TASK-028P design QA

Overall result: **blocked for expanded rich peer profiles by pending ADR-0036 acceptance**. The authorized owner / existing People text UI **passes** independent source review and local rendered/interaction checks through final source `2e9fa95`. Full requested rich-peer completion remains blocked, not passed.

## Scope and source

User-supplied reference: `docs/ux/evidence/TASK-028P/profile-reference.png` (793 × 1983). The authorized implementation covers the owner profile and current People text allowlist. Hometown, peer photos and peer prompts remain conditional on Proposed ADR-0036. Owner Edit details / Manage photos replace the reference's peer actions. Existing extra-photo removal is supported; primary photos can be added/replaced, not removed under the accepted contract. Existing extra owner fields are retained below the reference sections.

Before: `docs/ux/evidence/TASK-028P/profile-before-1280.png`. Three dedicated fictional local accounts were confirmed through real Supabase Auth and Mailpit. Maya has five generated owner-private photos and three prompts; Jordan has an accepted friendship and chat with Maya; Reese has a pending message request. No generated content is a default for real users. The user's earlier account and Hangouts were not edited.

## Comparison method and iterations

Source and actual rendered screenshots were viewed together in the **same image input**, including original-resolution comparisons. The final normalized artifact is `profile-comparison-793.png`: a 793 × 1983 browser screenshot of the top reference composition. A 793 × 3000 viewport removes desktop scrollbar reflow; clipping the top 1983 pixels preserves the full source composition and does not change the image pixels. Full-page and normal mobile/desktop captures are also retained. Ordinary 320/390/793/1280 viewport checks include the browser's 15 px scrollbar where present.

1. Initial `bcb999f` built successfully. Review found low contrast, text-glyph icons, doubled header height, a fake peer hero, save opening a disabled form, and missing focus restoration.
2. Independent review found compact chrome had removed navigation/Safety/account controls; actions followed interests; Say hi did not focus its input; source-backed UNC verification was absent. All were corrected, including unavailable/cleared states and outside-click focus behavior.
3. Rendered comparison found heavy/small body typography. Name/section scales and Nunito body/labels were corrected, retaining Baloo for the name, sections and wordmark.
4. Recipient testing found accepted/pending chats still offered a new first-message form. Existing caller-bound `get_dm_status` now supplies only a normalized state; request/chat links navigate to reauthorizing routes. Errors remain unknown, and lifecycle/denial masking clears known shortcuts. No new RPC, permission or body projection was introduced.
5. Final mobile screenshot exposed HTML image height=280 overriding gallery responsiveness. `61b2d7d` explicitly sets gallery image height:auto with the intended 1.31 aspect ratio. Actual ratios pass: 793 content width gives 356.5×272.125 tiles; ordinary 390 viewport gives 168×128.234; 320 gives 133×101.516. Each is 1.310 within rounding. No horizontal overflow at 320/390/793/1280.

6. Real cross-tab sign-out initially masked the DM shortcut but retained peer text and friendship controls. Final `2e9fa95` clears the whole peer view. A repeat on the exact production build passed: Reese’s text/Add friend/Check request disappear, neutral access recovery and safe navigation remain. Screenshot: `peer-auth-cleared.png`. The owner was signed back in and left on the review profile.

## Five visual surfaces

| Surface | Finding / intended difference |
| --- | --- |
| Typography | Baloo name reaches 68 px at source width; 40 px section headings. Nunito body 26 px, facts/answers 25 px, question labels 22 px; mobile minima remain readable. Reference-like rounded hierarchy, ordinary readable body text. |
| Layout | Measured primary photo x34/y81, width725/height358.906 at793 content width, matching the source's725×358. Two-column gallery, rounded academic facts, prominent actions, three prompt panels. Centered760 px desktop canvas. Missing hometown removes its line; no fabricated placeholder. |
| Color | Pale blue/white/navy reference palette retained; darker actionable/text blue is an accessibility difference. White on action #276da9=5.46:1; text #326b9d on pale #eaf5fc=5.09:1 and white=5.64:1. |
| Images | Five fictional fixture images are visually consistent and owner-private. Real profiles use the owner's own images through existing opaque owner routes. No fake peer hero, public URLs or peer Storage projection. Gallery crop correction is explicitly tracked above. |
| Copy | Source composition and sample owner bio/prompts demonstrated with fictional content. UNC badge states email verification only. Owner controls, genuine friend/request states, recipient consent, honest missing-content and recovery messages replace invented success or unsupported sharing claims. |

## Actual interaction evidence

- Real sign-in/sign-out and subsequent sign-in succeeded at localhost3029; current Hangout list remains reachable. Original127.0.0.1:3000 preview stays alive.
- Edit details focuses real-name input. Cancel restores saved values and returns focus. Valid save returns readable profile with success feedback; updated details persist on reload.
- Invalid incomplete prompt pair retains all entered fields with an inline error and active form. A concurrent second-session profile revision rejects stale save and preserves draft; explicit reload recovers current data. No automatic stale overwrite.
- Manage photos focuses/open its summary. Extra photo4 removal, new selected-file private preview, extra upload/add, primary replacement, and five saved images after reload were observed. Blank primary CTA opens the correct photo controls; blank gallery/prompts are honest actions.
- Compact options preserve gate-aware primary destinations, profile, Safety, analytics choice, attendance and sign-out. Escape closes and returns focus; outside-click Edit details keeps focus in the editor.
- Peer friendship Add friend → outgoing request → confirmed cancel; reverse request → incoming → confirmed accept → Friends all passed. Fresh message CTA focuses textarea; send changes to Check request. Pending survives reload without a fresh form. Recipient receives first message, accepts, and an existing profile's Open chat navigates to the accepted conversation.
- Temporarily opting Reese out via the existing owner RPC makes a fresh profile request unavailable, hides all peer details, and preserves standard navigation. Preference restored afterward.
- Lifecycle masking is independently source-reviewed. The in-app tab probe reports document.hidden=false even after creating another tab; it does not establish a browser visibility-event pass. Confirmed block/report components were not changed; cleared-state safe chrome is source-reviewed, not claimed as a newly completed hosted moderation test.

## Checks and boundaries

Fresh independent source review clears the exact final code `2e9fa9591b3ee802cf38d7e54729c0079e677134`; reviewer receipt is `005712b`. Final production webpack build and actual cross-tab Auth-broadcast retest pass. Final typography and gallery geometry were rendered and compared with the source at `61b2d7d`; the last code change is access-loss clearing only. Focused ESLint, web TypeScript, format/diff checks and isolated production builds passed. Existing profile normalization and friendship outcome suites pass5/5 without skips. React checklist: direct icon imports, caller-bound mutations, narrow serializable DM state, independent friendship/status reads in parallel, effect cleanup and semantic labels/focus reviewed; no material additional finding.

Runtime uses an exact committed source snapshot with three **test-copy-only** local target/origin adaptations, private environment/credentials and a detached OS server. Source hosted checks, database gates, migrations, RLS and Storage policies were not changed. Local `/api/health` remains503 because the existing health contract requires hosted HTTPS/env/Mapbox; successful actual sign-in/routes/Auth checks establish this local preview only. Mapbox token is absent, so map fallback does not certify live tiles.

ADR-0036's proposed technical plan independently cleared planning review after lock-order correction; it remains Proposed and unimplemented. Parent TASK-027 staged student/moderation/recovery acceptance and TASK-028 main source integration remain incomplete. A local UI pass is not full rich-peer completion or a production release.

# TASK-028 reference comparison and interaction plan

Reading this as a faithful refinement of a campus coordination app for UNC students, using the model's own rounded Pals language and existing native CSS. Leon's Taste applies contextually; reference fidelity and accepted product/privacy/accessibility rules control. Design variance 3, motion 2, density 4, derived from the observed orderly map/list layout and restrained transitions.

## Captured baseline, 2026-10-06

Browser resolves https://usepals.com/ to https://www.usepals.com/. Desktop viewport 1280×900: header88, centered logo90×70; main32px top/34px side padding; hero30px radius,33px/40px padding, roughly265px high; headline Baloo2/800,80.64px/.8 line-height; blue #79afe0; map/list24px gap, map20px radius, narrow Nearby rail. Controls Baloo2/700, body uses the live inherited Baloo2 (earlier model CSS has Nunito Sans). Existing logo SHA256 exactly matches public model a237c3c5c10256b5b48c0ba226400ac193b31d2112598e6d51400e234fec6bd1. Self-host exact Baloo2/700/800 and NunitoSans/700/800 with OFL licenses; retain existing Nunito fallback.

Captured Explore and Calendar desktop, Explore and logged-out create/auth prompt at390×844. The mobile model squeezes header controls, hides Explore and wraps Log in; implement accessible two-row navigation instead. Public model Calendar/People/first-create prompt are inspectable, but no authenticated reference session is available. Do not claim parity for unseen profile/editor/chat states or import sample peer photos/data. Capture artifacts remain local under `/private/tmp/pals-task028-evidence/reference`.

## Implementation plan and necessary differences

- Center existing exact logo; combine desktop student header/navigation while keeping Hangouts · Calendar · People · Chats · Notifications, source-gated destinations and avatar settings. Accessible wrap/scroll on narrow screens,44px targets, skip/focus states and reduced motion.
- Match feature hero typography, compact height, rounding, spacing and white primary action. Preserve readable semantic action/body foregrounds: model pale blue/white small text does not meet contrast. Use darker accessible foregrounds and sufficient contrast behind large white headings; document measured values at final comparison.
- Saved discovery uses real Mapbox and source-authorized approximate location, with empty/error/loading recovery and list alternative. No public fake map/activity. Reference Leaflet tiles, category inventory, terminology and public peer photos do not change accepted scope.
- Improve profile/upload, browsing-return context and chat refresh/scroll/recovery in assigned independent slices. Retain drafts only in mounted owner-authorized memory; clear on auth/permission loss. No new schema, permissions, provider, peer projection or Realtime.
- Compare corresponding desktop/mobile public and authorized student surfaces; verify320/390/820/1280 and keyboard interactions. Screens unavailable due to credentials remain explicitly unverified. Tests and builds supplement rendered evidence.

## First rendered correction

At1280 the app now measures header88px, hero265px at x34/y120, headline80.64px/64.512px and logo90×70, matching the reference's corresponding type/geometry before its -1.5° heading rotation. The rotation is now matched too. The body/action/nav foreground stays dark for contrast. Feature blue is darker behind white large headings (#5c8fb9→#6498c3, white contrast3.45→3.08), then transitions toward exact brand #79afe0 on desktop; phone uses #6498c3 (white3.08). Small body text uses dark ink. These are deliberate accessibility differences from model white small text on #79afe0 (2.33). Public entry uses Join Pals and explains UNC confirmation; the real map remains authenticated to preserve accepted access.

Review corrected return-camera loss, early scroll restoration and missing return focus. Camera is validated/coarsened to a campus area, expires after30min and lives in tab memory only. Locate-me orientation clears/excludes camera memory. Stored filter/scroll return preferences are consumed once; no Hangout IDs/records, peer data or message/profile drafts enter browser storage. Final permission/data queries remain fresh.

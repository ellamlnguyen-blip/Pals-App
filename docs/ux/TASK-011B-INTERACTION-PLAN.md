# TASK-011B People interaction plan

The live `https://usepals.com/` inspection was inaccessible on 2026-09-22. This uses the recorded reference in `DESIGN_DIRECTION.md`: white/blue, rounded, welcoming, and consistent with the existing app tokens.

- Desktop: primary nav leads to a restrained directory with one search/filter form, a readable two-column card grid, and a separate owner privacy entry. Peer detail is a focused text page. No photo stand-ins or popularity cues.
- Phone (320–390px): nav scrolls horizontally; controls and cards stack at full width, with 44px minimum targets and no horizontal overflow. Detail and privacy controls remain above long explanatory copy.
- Search and filters submit GET parameters. Paging uses the backend cursor, and detail links carry the current URL as a bounded return target. Browser back restores the submitted filter/page and native focus. No client result cache or speculative peer data is stored.
- Ready-only directory and detail recheck the gate and caller session on each request. A separate privacy route admits active owners even if onboarding, unverified, or gate-off. Restricted accounts cannot manage it. The server RPC remains authority.
- Block confirmation spells out bilateral People hiding and unchanged Hangout participation/private instructions. Submit immediately removes peer text from the current view and returns to the directory after authority is rechecked. Outbound management lists only IDs with exact-ID confirmation for unblock.
- Loading, denied, empty, invalid, and connection states use plain text and recovery links. Dialogs restore focus to their trigger; focus rings and status text are visible. No decorative motion is needed.

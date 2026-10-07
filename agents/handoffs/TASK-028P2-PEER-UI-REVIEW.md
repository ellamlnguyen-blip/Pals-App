# TASK-028P2 peer UI source review — 2026-10-06

Independent bounded review of committed peer UI `861988b` on `agent/TASK-028P2-rich-profiles`, compared with Accepted ADR-0036 and the rich-profile technical contract. I reviewed its page loader, client profile, photo component and handoff plus the reused friendship, DM and safety controls. I did not change app or database code. PHOTO queue changes and runtime image tests are separate pending review gates.

## Disposition

**Peer UI source has no blocking finding within this scope, conditional on corrected PHOTO runtime behavior and browser QA.** The page first asks the caller-bound `get_rich_people_detail` RPC and renders only its authorized allowlist. A zero-row result follows the existing text-only RPC; an RPC error gives a neutral unavailable state rather than treating it as consent. The selected rich row carries its own subject ID, text, optional hometown/prompts, verified-email claim, opaque photo slots and current profile revision. No raw profile/Storage path is passed to the client. Missing optional sections are omitted.

The photo component uses the opaque `/people/{id}/photo?slot=...&revision=...` route with unoptimized image requests. Its dialog offers View photo and Close only, with trigger focus restoration on close. Rich photos, hometown and prompts are absent from the text-only fallback. The `ProfileSummary` verified label is backed by the rich RPC's live claim, or by the legacy text RPC's live `ready_subject_campus` authorization for its fallback row.

The client replaces the whole peer profile with a neutral cleared view after a photo failure, confirmed block, friend/DM access-loss signal, auth transition, page hide or hidden-document transition. The cleared view carries no prior peer text/image and offers a full navigation reload for fresh server checks. It retains the established Add friend state machine, first-message DM request flow, and Safety report/block control; it does not imply a DM is accepted merely because a request was sent.

## Required remaining evidence

- The current PHOTO route admits only two simultaneous requests per process and immediately returns 503 for later requests. A normal rich profile can request five images; one such 503 triggers whole-profile clearing. A bounded FIFO queue with a deadline/abort rule and a regression that all five normal concurrent images succeed is required before the peer UI can be considered usable. Review the corrected committed queue and its tests separately.
- Actual cookie-authenticated photo HTTP, real Storage two-check barriers, cache/error/method headers, bundle secret scan and browser populated/empty/revoked states remain pending. The peer handoff's lint/typecheck and source review do not establish rendered behavior or runtime authorization.

No database, hosted, reset, push or shared-queue operation was performed by this reviewer.

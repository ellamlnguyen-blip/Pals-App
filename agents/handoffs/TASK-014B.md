# TASK-014B local DM UI handoff

Status: corrected implementation branch for independent exact-tip security/design review; not integrated on main. Coordinator owns acceptance, shared records and canonical integration.

## Baseline and scope

- Isolated branch `agent/TASK-014B-dm-ui` from independently verified canonical `origin/main` `9b76bcc19850f28b856a770f9539ad1608a7f670`.
- Accepted ADR-0016 and published TASK-014B govern this disposable-local UI. No migration, backend RPC, Realtime, hosted enablement, notification or Hangout authorization change.
- GPT-6 Sol medium was specified by the coordinator. The dispatch tool did not expose a speed selector, so Standard speed was not independently verified here.

## Outcome

- Added no-store, loopback-guarded, current-session HTTP endpoints for DM inbox, request creation, status/messages and transitions. The actor header binds the original page account to the server-derived session; database RPCs remain authority. Creation rechecks fresh People detail.
- Added People-detail first-message consent composer, exact UUID/body uncertain retry, and local DM teardown copy to the existing People block confirmation/action. A React Strict Mode remount found during rendered inspection was corrected so the composer remains available.
- Added Requests and Direct chats beside existing independently gated Hangout chats. Active but temporarily unready participants can access minimal DM management. Incoming request text uses only the authorized first-body projection; outgoing pending and accepted rows have no preview. Unknown peers show a neutral label and full participant-owned ID.
- Added direct route with recipient accept/reply/ignore, sender waiting/withdraw, accepted send/pages/close, paused cleanup and ready-caller People block. Bodies remain literal text with line breaks, server time and You/Peer. Client masks on hide/pagehide/auth change, discards stale responses, and polls only the visible bounded page.
- Exact-tip review found an inbox auth race: one boolean could reveal text after the first of two overlapping transitions settled. The inbox now tracks every transition token and uses an original-account server probe without copying its bodies. It stays masked until all tokens resolve; stale completion markers alone cannot reveal content. Added an overlapping-token regression test.
- Added explicit no-store headers for `/chats` and `/chats/:path*` in Next config and `docs/ux/TASK-014B-INTERACTION-PLAN.md`. Live `usepals.com` was attempted on 2026-09-23 but failed DNS/navigation; existing direct reference observations and current tokens/components guided the design.

## Verification

- Final `pnpm check` passes formatting, lint, workspace types, unit tests and web/admin production builds. The focused overlapping-transition unit test passes. `git diff --check` passes.
- Real disposable-local Auth/PostgREST DM consent/revocation test passes. New signed-in web route test passes original-actor binding, no-store JSON responses, exact-key dedupe and changed-body conflict, outgoing first-body redaction, incoming first-body read, reply-and-accept, accepted history, opt-out pause/restoration, active-but-unready minimal management, close and terminal denial. The built Next server returned no-store for the direct content page. Next dev itself reported `no-cache, must-revalidate` for rendered pages despite headers; production-mode test confirmed no-store.
- Native Chrome Incognito rendered checks reached People request, outgoing waiting, incoming inbox/detail, reply-and-accept, accepted thread and multiline literal `<script>` text. Enter inserted a newline; Tab showed a visible Send focus ring; Return sent. A peer opt-out hid all direct bodies/composer while retaining management, and opt-in restored them. Signout in another tab left the original direct tab unavailable with no text. Coordinator independently inspected the same flow in the in-app browser and found no horizontal overflow at an effective 325px phone viewport.
- Rendering was not separately measured at exact 320px, 390px or tablet widths. Browser automation did not directly force two overlapping auth transitions, bfcache or in-flight response revocation; the token regression test and stale-response checks cover those paths in code. Ignore/withdraw/close/block copy, large-page cursor transitions and all adversarial target cases need exact-tip reviewer scrutiny and any targeted follow-up deemed necessary.
- All five local gates were verified false; DM pairs/messages/retries/suppression and `dm-visual-*`/`dm-web-*` Auth fixture users were zero. Disposable web server, Supabase and Lima VM were stopped. An initial Lima startup attempt failed (`did not receive an event with the running status`), then the coordinator recovered the existing VM and the signed-in tests above ran successfully.

## Review focus

Review inbox/direct auth masking, no-store page behavior, paused management and retry/state conflicts at the exact pushed tip. The branch is intentionally unintegrated; TASK-014 and successor dispatch remain the coordinator's responsibility.

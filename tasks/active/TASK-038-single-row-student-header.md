# TASK-038 — Single-row student header at desktop widths

Status: active. Ella's 2026-10-16 browser comment on the Chats preview asks that Hangouts, Calendar and Pals sit on the same horizontal line as the Pals logo and the Chats, Notifications and profile buttons at a 1088px viewport. Start from canonical main `90cce968e3adcf8e3546b8e7ffc55a8efd034043` plus exact reviewed local app dependency `agent/TASK-037-chat-categories` at `8aa18c5a8d8ee99d5d9164583c00bad432106720`. TASK-032/033/034/035/036/037 release and application-main gates remain open. No hosted operation or app-main integration is in scope.

## Outcome and bounds

- Adjust the shared student header layout so logo, primary navigation and account icons align in one row at 1088px and other roomy widths. Preserve the existing links, icon states, focus targets and account concealment behavior.
- Keep a usable wrapped/two-row layout where narrower widths need it, especially phones. Do not shrink controls below 44px targets or cause horizontal overflow. Avoid unrelated route or branding changes.
- Use existing Pals tokens and components. This is a presentation-only CSS/layout correction; no schema, RPC, RLS, auth or navigation behavior change. The attached browser screenshot is evidence of the current two-row layout, not a source of new content.

## Interaction and visual plan

The student header remains a simple three-part row when space allows: logo at start, primary links centered, account icons at end. Shift the responsive stacking threshold below the user-observed 1088px width, choosing it from measured fit rather than an arbitrary desktop label. At small widths, keep the current order and keyboard navigation. The exact latest Pals header styling and icon labels take precedence over the older illustrated Chats mockup.

## Verification

Read AGENTS, this contract, design direction, tokens and the installed `design-taste-frontend` skill; attempt `https://usepals.com/`. Inspect the current header and CSS. Run build/TypeScript and focused layout checks. Render authenticated Chats at 1088px and boundary widths, plus 375px phone; check logo, nav and three account controls share a row where required, no overlap or horizontal scroll, visible focus and current-page state. Check limited account layout is not broken. Record screenshots and handoff, publish task branch and docs-only main status. Keep application code off main while predecessor gates remain open.

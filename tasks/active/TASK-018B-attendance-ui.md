# TASK-018B — Student attendance UI

Status: Reviewed dependent contract; implementation waits for reviewed/integrated TASK-018A
Date: 2026-09-24
Parent: `tasks/active/TASK-018-attendance-confirmation.md`
Planning baseline: independently remote-verified main `5e941bfb81bc2a64ad33f0d6557ff656a8d6e0ac`

## Goal

Give a student a calm, private way to answer whether they attended their own past Hangout, review a saved answer and correct it while the database window remains open. The answer is self-reported. UI display and navigation grant no authority beyond TASK-018A's caller-bound RPCs.

## Dependency and scope

Implement only after the accepted ADR-0022 receipt is independently remote-verified on main, TASK-018A is integrated on remote-verified main, and this UI contract is reconciled against A's exact projection/denial behavior. Add a local-only `/attendance` owner route and small entry points from Calendar and the signed-in account menu so active owners whose profile or campus readiness lapsed can still reach it. Keep the five primary destinations unchanged. The account entry appears only when the local attendance surface is available. A's list RPC returns zero rows both when the attendance gate is off and when an owner has no eligible rows; render that ambiguous result as a neutral unavailable/no-records state with Retry, never as proof that the owner has no past Hangouts. The page uses `access()` and permits signed-in active states, while signed-out/restricted states show a neutral sign-in/unavailable shell. All responses are no-store.

## Interaction and privacy contract

- Load one 24-item ID-keyset owner page from A. Show a saved answer, whether the response is currently actionable, and a clear next/previous page. Do not treat an empty page as proof no other pages exist. Exact ID must be selectable/copyable for recovery. Never display peer answers, counts, host identity or hidden source metadata.
- An independently authorized existing Hangout detail and current-membership read may enrich a row with title and schedule only while the caller is currently joined or is its host. A left, removed or otherwise hidden source remains ID-only. If either read denies, races with revocation or is unavailable, render only the owner's opaque ID and answer state; do not preserve a prior title/time in component state. Never call a new broad detail endpoint or derive display from a notification or stale Calendar cache.
- An unanswered actionable row asks “Did you attend this Hangout?” with `I attended` and `I did not attend` choices and a separate Save action. A saved row says “Your answer” and offers Change while actionable. State that this is self-reported; a join is not proof. Explain the general 30-day correction rule. Show an exact deadline only when independently authorized source schedule is visible and the row is actionable. If closed, show a saved answer read-only or explicitly say that no answer was saved and answering has closed; retain that owner ID row. If `within_window` is true but `currently_actionable` is false, say “Answering is unavailable for this Hangout” without asserting why, showing a deadline, or promising a retry time; A's projection combines source-gate-off and pre-start cancellation.
- Submit the exact selected ID, boolean and expected revision through an actor-bound server path to A's write RPC. Disable duplicate simultaneous submits. A confirmed response is displayed only after a fresh exact own-read; stale conflict reloads that row and asks for a deliberate new choice. A lost or unknown response also performs exact own-read: if the intended answer is saved, confirm it; otherwise keep the result uncertain and offer an explicit retry using a freshly observed revision. Do not silently send a different-value retry or claim a write failed merely because the request timed out.
- A link to `/safety` offers the existing private reporting workflow as a separate action. Do not auto-file a report, prefill an allegation, add a safety question or imply a negative attendance answer is a safety report. Do not add an unreviewed deep-link parameter that could turn a hidden Hangout ID into source detail.
- Actor change, signout, restricted transition, page hide/restore, gate denial and disabled-source denial immediately mask ID, answers and any enriched source text, clear in-memory selection/retry state, and prevent late responses from repainting. On restore, reauthorize and load afresh. Do not put IDs/answers in URL, browser storage, analytics, logs or copied error messages.

## Visual plan and checks

Use `docs/ux/TASK-018B-INTERACTION-PLAN.md` as the implementation plan. Reuse Nunito, Carolina blue/white semantic tokens and the existing `Frame`; no sixth primary nav item or new design library. Follow the installed `design-taste-frontend` skill where it fits a small product utility, while product/accessibility/safety rules control the flow. Verify rendered desktop/tablet/phone/320px, keyboard, focus, light/dark, loading/empty/error/gate-off/denied/stale/unknown states against a local production build with disposable users. Test a hidden blocked/removed row, unready active owner and source disable. Run relevant UI/action checks, full workspace checks as available, clean all fixtures/gates/services, obtain a fresh exact-tip design/security review and write a handoff.

## Exclusions

No backend migration, new SQL permission, source authorization change, attendance notification, automatic reminder, peer summary, public count, geolocation verification, host override, safety-answer collection, report mutation, PostHog event, push/email, hosted deployment, live users or gate enablement. Surface any A/UI contract mismatch to the coordinator rather than broadening this stage.

## Contract review outcome

A fresh GPT-6 Sol medium reviewer found two P2 gaps in the draft: exact deadline wording implied an unavailable server projection, and a closed window with no saved answer lacked a state. The plan and contract now derive any exact deadline only from separately authorized source schedule and explicitly retain/read-only show a closed unanswered row. Re-review found no remaining concrete P0/P1/P2 issue. Standard speed could not be verified through the dispatch tool.

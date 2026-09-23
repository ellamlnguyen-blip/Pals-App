# TASK-015C Notifications interaction and visual plan

Status: Planning reference for reviewed UI contract
Date: 2026-09-23

## Design read
Student coordination inbox for verified UNC users. Use the existing Pals white/campus-blue rounded language and Nunito typography, with restrained motion and enough density to scan several functional updates at once. The live `usepals.com` reference was inspected on 2026-09-23; its notification icon and bright, friendly shell are visual reference only. Accepted Pals navigation and Hangout terminology control the app.

## Screen hierarchy
1. Shared primary navigation, Notifications selected.
2. Compact heading: “Notifications” and a short explanation that these updates help with plans and conversations. No social engagement counters.
3. Inbox: bounded chronological rows with a clear unread treatment, neutral unavailable row, time, and one allowlisted destination action when currently authorized. Friendship actions land on the generic paginated friendship list and are labeled accordingly. Older-page control follows the row list.
4. Preferences: four plain-language category controls. Explain that turning one off stops future optional inbox items, not the underlying activity. Cancellation remains essential and has no toggle.

## Responsive and state plan
- Desktop/tablet: readable central column with inbox first and preferences beside or below it according to width; avoid a dense dashboard grid.
- Phone: single column, full-width touch targets, navigation and actions that do not overflow at 320–390px.
- Loading: keep private rows masked until the current account is verified. Empty: explain that updates will appear when plans or conversations change. Error/denied/uncertain refresh: keep old rows masked, state the issue plainly and provide a current-owner retry or safe route. Uncertain mutation: preserve honest pending/unknown state and reload guidance.
- Keyboard: visible focus, logical tab order, Enter/Space for controls, status announcements without moving focus unexpectedly. Respect reduced motion. Verify light/dark contrast with shared tokens.

## Interaction boundary
Page fetches only one authorized 24-item page at a time and refreshes on focus/visibility after account verification. A notification may become unavailable after delivery; it loses its source link and identifying detail. Opening a currently linked item still runs the destination's existing authorization. No body snippets, peer photos, unread badge, arbitrary URL, push opt-in or Realtime subscription.

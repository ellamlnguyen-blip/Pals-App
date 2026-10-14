# ADR-0039 Hangouts time filter query extension

Status: Proposed implementation record for user-requested Today/Tomorrow/This week/Later discovery filters on 2026-10-14. No new authority, privacy strategy, schema field, provider or hosted operation is proposed or accepted.

## Approach

A UI filter applied after a 101-row saved-map probe can hide Later results behind earlier excluded rows. Preserve `public.query_saved_hangouts` exact existing signature, grants, live caller checks, gate lock/epoch, ranking, output and legacy upcoming/all modes. A committed migration extends only the existing text filter argument with a strict four-bit period mask. Compute disjoint America/New_York civil-day bounds from the same near-now validated cutoff and apply the union inside candidates before ranking and the 101-row probe. Today covers upcoming starts today, Tomorrow next civil day, This week remaining days before next Monday, Later after those intervals. Tomorrow takes precedence across Sunday/Monday.

## Boundaries

This narrow function behavior supports the explicitly requested checkboxes. Fresh security review and actual-role/boundary tests precede dependent UI use and disposable-local application. A proposed record does not authorize a major identity/privacy/schema/provider redesign or hosted migration. Existing stage/main acceptance gates and default-off safeguard ranking remain unchanged. No persistent category field, historical time rewrite, grant, RLS or secret projection change.

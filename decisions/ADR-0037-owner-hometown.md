# ADR-0037 — Optional owner-authored hometown

Status: Accepted
Date: 2026-10-06
Decision source: current explicit user instruction, “you did not add in the hometown area with a pin underneath the profile photo,” and “this is a sample test ... general for each user.”

Add an optional self-declared hometown to every owner's profile, displayed with a map-pin icon beneath the name/verification row and before the bio, matching the supplied screenshot. The value is each user's own plain city/region text, never inferred from GPS, IP, email or campus; no fixture default. Store nullable `public.profiles.hometown`, trimmed, 1–100 Unicode characters or null. Reuse owner-only RLS, existing revision compare-and-swap and active-owner write guards. Blank input clears it. Profile/hometown remains optional for access.

This accepted owner-field decision creates no peer grant or rich consent decision. ADR-0036 remains Proposed until its distinct default-off sharing policy is explicitly approved. No raw peer profile read, public Storage, hosted migration, gate activation or production operation is authorized here. Committed migration, owner/other-user denial and validation/CAS checks plus independent review are required before using the new local field.

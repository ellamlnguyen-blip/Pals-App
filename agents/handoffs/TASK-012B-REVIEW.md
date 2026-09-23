# TASK-012B independent security/design review

Date: 2026-09-23
Starting published main: `7c20f6b5f987f463ba36dd9264628228ec09a702`
First UI tip: `7b0c2bf6e46ed37e1b9f89ae452c22cebc418916`
Reviewed corrected UI tip: `b21f4e247ae24ec3ac5ae70bea24efb50aee09ad`
Coordinator integration merge on `agent/TASK-012-planning`: `39bfe3223bb7dbb6a5eb60cafe451b47a712f604`
Reviewer: fresh GPT-6 Sol medium read-only security/design agent; Standard speed is the app preference but not verifiable in dispatch tooling.

The first exact-tip review found two actionable states. A denied create after a peer's People visibility changed could return an empty, “known” friendship and leave old peer text and retry controls on screen. The known-ID block control also allowed an immediate repeat after an unknown verification result. The UI agent corrected create-result handling to distinguish an RPC denial from transport uncertainty, recheck current People visibility and clear text on detected loss. Only an uncertain transport result with current visibility permits same-key retry. The known-ID block control now locks after every attempt and offers reload/outbound-ID inspection.

Fresh review of corrected tip `b21f4e2` cleared both findings and found no new actionable regression in changed paths. The reviewer ran the three focused outcome tests and checked the diff. The implementer recorded `pnpm check` passing with 20 Node tests and builds, plus a passing production-build real Auth/action suite covering no-store responses and friendship/People privacy cases. The reviewer did not rerun the stopped local Auth/browser setup. The Next development helper still emits `no-cache, must-revalidate` for its existing People assertion; production page/action responses passed no-store checks.

The implementer inspected rendered pending/incoming UI at desktop 1280×720, 390×844 and 320×700, plus native dialog keyboard focus/Return/Space/Escape. Empty/gate-off/invalid/stale/unknown/denied states were inspected through code/HTTP rather than all rendered. A focused browser retest of the corrected unknown-lock state was unavailable after the Mac locked; focused unit and real action checks covered it. No screenshot file or exported console log was saved. Final local People/friendship/Hangout gates were false, friendship/synthetic users zero, and Supabase/Lima stopped. The coordinator inspected the handoff/diff and independently verified the corrected remote task tip. Canonical main publication remains the final receipt step.

TASK-012B changes only the local People UI/actions/tests. Peer photos, Hangout access, DM, notifications, global blocks and hosted use remain outside this review.

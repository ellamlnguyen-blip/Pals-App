# TASK-028P2 — Reviewed local rich profile handoff

Date:2026-10-06. Branch:`agent/TASK-028P2-rich-profiles`. Status: local acceptance/review passes; parent/canonical application integration incomplete behind TASK-027 staged acceptance. No successor from this substage.

## Outcome

User accepted ADR-0036's separate default-off rich choice. Added caller-owned CAS consent, atomic rich clear on People opt-out, a single-snapshot minimal rich detail, and cookie-authenticated sanitized photo delivery. Raw rows/uploads remain owner-private; subject rich consent plus both People choices, current confirmed exact UNC evidence, same active campus, policy/capability/gates, publishable text and bilateral no-block rules authorize fresh peer requests. Own rich opt-out remains available to active accounts after gate/readiness loss. Hometown, images and prompts are per-user; missing content is not populated from the sample. Owner clicking an image offers View/Edit; peer images View only. Friendship, DM and safety authority are reused.

## Reviewed artifacts

- DATA:`cafd6cb`, independent source review`dc68d75`, real HTTP/races`096e51c`, runtime/owner UI review`ac6867a`.
- PHOTO: reviewed production source`e27db7a3808a266d452878581e9d0c5a73f9b4cf`, independent review`535434e3f57301b348d6d404f42d9087f76a5ed5`; final actual HTTP/Storage evidence`caa43d0`. Earlier UUID, admission and proxy-header/deadline bugs were caught during QA and corrected before handoff. Canonical path validation and second fresh object/authorization check protect broad server Storage access. Two active operations plus16 pending,5MiB stream input/output,20MP,2048px sanitized WebP, bounded signal/decode.
- UI: owner`f4727cc`/`ef0d265`, peer`861988b` reviewed`4048fb5`, accurate photo copy`13ce456` reviewed with535434e.
- Only independently reviewed local migrations002/003 persisted to `pals-task028-disposable`55422/API55421. SHA256002:`2ad4e999ff07378008c338f036f19865ef0971da649987d869616b349f3f33c0`;003:`d43fc01c24a322c3d6534c12361c26380e9ec4057017dc29e9e9581f24ff6ce2`. History recorded, no reset or original-stack change.

## Validation and evidence

Fullunits63/63 without skips; whole-workspace lint/typecheck; final production webpack build; DATA SQL55/PHOTO SQL11 rollback; real Auth positive/negative consent/detail; seven observed committed lock races; final cookie-photo harness twice including five parallel images, wire privacy/method/denial matrix and real two-check Storage barriers. Client static scan89files found zero literal service-key/server-helper identifiers. `design-qa.md` P2 section records final browser default/CAS/atomic-clear/gate-off opt-out, all five peer views/focus, per-user populated/empty/text-only profiles, real chat navigation, safety entry, denied-image clearing/full reload, cross-tab sign-out and320/390/793/1280. Reference/render same-input comparison and screenshot evidence in `docs/ux/evidence/TASK-028P2/`.

Preview:http://localhost:3032/profile at exact reviewed app sourcee27db7a, detachedPID92709. Manifest1064tracked/0mismatch/3runtime-only local port/origin adaptations. Private0600 fictional credentials:`/private/tmp/pals-task028-rich-test-sign-in.txt`; never committed. Final session Maya; sign in as Jordan then People→Maya for full peer view. Only these two fictional owners opted in through their own real UI. All unrelated gates match pre-browser snapshot; disposable rich gate intentionally on for review. Test harness cleanup had first restored gateoff/prefs0 and preserved its fourth subject.

## Boundaries and remaining work

No hosted keys/migrations/gates/deployments/domains changed. Shared staged/untracked user checkout untouched. Local health503/missing Mapbox remain existing preview limits; no live-map/production claim. Cookie expiry/refresh timing, hidden-tab provider behavior and CPU-abort timing were not separately chaos-tested. Already delivered bytes cannot be recalled. Tool refused fresh PHOTO agent dispatch at its thread limit; bounded relevant worker reuse plus a different independent reviewer were used. Solmedium dispatch was explicit; Standard speed is not exposed/verified by tool.

Source/handoff `2701d7a85a2771776fce3898a62ca1824c0702be` passed final independent review and is pushed/exact remote-verified. Documentation-only canonical milestone `bcc35688e5a92a66e9de96e7dd180e4134d1de66` is pushed and exact remote-verified. Latest task tip `20cdd69cc45398334dbd37aeaee29bd980d1a514` and both branch/main receipts are recorded in TASK-028P2-PUBLICATION.md. Parent TASK-028P/TASK-028 and canonical app integration remain incomplete until TASK-027 staged acceptance; no automatic successor is warranted by this substage.

Latest task tip `20cdd69cc45398334dbd37aeaee29bd980d1a514` is pushed and exact remote-verified; the post-review change reconciles only the older hometown documentation with the accepted rich projection. Independent read-only review cleared the scoped canonical documentation milestone, including this correction. Main publication receipt is TASK-028P2-PUBLICATION.md.

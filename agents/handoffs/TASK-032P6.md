# TASK-032P6 People display cleanup handoff

Status: bounded source edit and scoped checks complete; coordinator review, rendered verification, publication, and parent TASK-032 gates remain open.

Removed the UNC directory badge, introductory People sentence, page-count sentence, and normal heading link to People visibility. The People heading and friendships link remain. The pagination wrapper now renders only when Start over or Next page exists; both links keep their existing destinations and conditions. Search, cards, profile links, empty/error states, and the visibility route and preference controls were not changed.

Verification: scoped ESLint and Prettier checks on `apps/web/app/people/page.tsx` passed with installed binaries; `git diff --check` passed. No markup-mirroring test was added. Coordinator owns build, browser checks, review, remote publication, and shared records.

No backend, schema, authorization, persistent data, or hosted environment changed. This display cleanup does not complete parent sign-off, device, fault, staging, or application-main gates. Standard speed could not be configured or verified through the task tools. No successor was dispatched.

## Coordinator verification and source publication

Reviewed the exact source diff: four marked display items removed; only the pagination wrapper condition changed, with both real link conditions/destinations preserved. Runtime production webpack build (including web TypeScript) exited 0. Reloaded People at actual 319×720 viewport: all four texts absent, three search inputs, Your friendships, two authorized cards/profile links present, no empty pagination wrapper. Saved full-page screenshot was visually inspected; capture can reflow independently, see manifest. No synthetic pagination data or backend mutations were needed; real multi-page navigation was not exercised for this display-only correction.

Contract `7873813ce0075bfd9ed1c2ce806127c4cb0a498b` and canonical `8241adc820cf38b684a7a38bdef1573eeccc26f7` were published and independently verified before fresh GPT-6 Sol/medium dispatch. Source `e01ddf58cfdcec5df4d5de56d958823728c6a0c8` was pushed and independently ls-remote verified. Parent TASK-032 remains incomplete behind existing acceptance/sign-off/integration gates. Main outcome publication is documentation/evidence only; no hosted change or successor.

## Canonical publication receipt

Documentation branch `503ecd6a1802d534555b4ede77901441db3585ee` and documentation-only canonical integration `ccabab03c6f7c92d0a7fb40e60a4ca885078cf90` were pushed and independently remote verified. Inventory contained nine documentation/evidence files only. Application source remains on e01ddf5 behind parent gates; this receipt does not mark TASK-032 complete.

# TASK-032P6 People display cleanup handoff

Status: bounded source edit and scoped checks complete; coordinator review, rendered verification, publication, and parent TASK-032 gates remain open.

Removed the UNC directory badge, introductory People sentence, page-count sentence, and normal heading link to People visibility. The People heading and friendships link remain. The pagination wrapper now renders only when Start over or Next page exists; both links keep their existing destinations and conditions. Search, cards, profile links, empty/error states, and the visibility route and preference controls were not changed.

Verification: scoped ESLint and Prettier checks on `apps/web/app/people/page.tsx` passed with installed binaries; `git diff --check` passed. No markup-mirroring test was added. Coordinator owns build, browser checks, review, remote publication, and shared records.

No backend, schema, authorization, persistent data, or hosted environment changed. This display cleanup does not complete parent sign-off, device, fault, staging, or application-main gates. Standard speed could not be configured or verified through the task tools. No successor was dispatched.

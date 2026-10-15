# TASK-032P7 Chats label cleanup handoff

Status: bounded source edit complete; coordinator review, build, rendered verification, publication, and parent TASK-032 gates remain open.

Removed the small `Chats` badge paragraph immediately above the `Your chats` heading on `/chats`. The heading, shared styles, detail-page badges, inbox, Hangout chat list, links, access checks, and backend behavior remain unchanged.

Verification: scoped ESLint and Prettier checks on `apps/web/app/chats/page.tsx` passed with installed binaries; `git diff --check` passed. No markup-mirroring test was added. Coordinator owns build, rendered verification, review, remote publication, and shared records.

No backend, schema, authorization, persistent data, or hosted environment changed. This display cleanup does not complete parent sign-off, device, fault, staging, or application-main gates. Standard speed could not be configured or verified through the task tools. No successor was dispatched.

## Coordinator verification and source publication

Reviewed exact application diff: one badge paragraph removed, no callbacks or backend changes. Runtime production webpack build including TypeScript exited 0. Reloaded /chats at actual 319×720 viewport: badge count 0; Your chats, Requests, Direct chats and Hangout chats remain. Saved screenshot visually inspected. No messages sent or data mutations; this is a display-only correction.

Contract `d936ab0fe3d814f32d9d10176d97263b7cfa34f1` and canonical main `0b00302ab9005dc44ebff23009b8892bf130f9fe` were published and independently remote verified before fresh GPT-6 Sol/medium dispatch. Source `347375374e46d774d91733a38d91404e4269f7a3` is pushed and independently ls-remote verified. Main receives documentation/evidence only; parent TASK-032 acceptance/sign-off/application-main gates remain open. No hosted action or successor.

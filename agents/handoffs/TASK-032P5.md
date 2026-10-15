# TASK-032P5 Calendar copy handoff

Status: source reviewed and locally verified; task source published; documentation-only main publication pending; parent TASK-032 remains incomplete.

Changed the Calendar date selector's visible label from “Campus date” to “Date” and its accessible name from “Choose campus date” to “Choose date”. Removed the Week/Month “Scroll sideways to see all seven days.” paragraph and its now-unused hint CSS, including both media rules. The calendar scroll regions, focus styles, month minimum width, dates, filtering, and data behavior are unchanged.

Verification: `git diff --check` passed; scoped ESLint passed with its existing “Pages directory cannot be found” advisory; web `tsc --noEmit -p tsconfig.json` passed; Prettier check for both changed source files passed. No markup-mirroring test was added for this copy correction. Coordinator owns rendered checks, review, branch publication and shared records.

No backend, schema, authorization, hosted environment, or persistent data changed. This substage does not meet parent sign-off or release gates. Standard speed could not be configured or verified through the task tools.

## Coordinator review and rendered verification

Contract branch `78ee8b7ed36fe34410eebc8b78403113df57a805` and canonical main `20565bca9e9cfae8921426a3b42dfcf3bd519b98` were pushed and remote verified before fresh GPT-6 Sol/medium dispatch. Source `3a2dd701c0c18c56a6196818db61eb251b92efd1` is based on `f52a46cab431be8715a6e448ba2852036f0291a1`. Coordinator reviewed its complete two-file application diff: copy and unused hint CSS only. The runtime production webpack build (including web TypeScript) exited 0.

Rendered Week → Month → Week checks passed at the actual 319×720 browser viewport. Both views show Date / Choose date and zero hint paragraphs; both retain their named scroll regions. Date remained 2026-10-14 and all three category checkboxes stayed checked. Saved unmodified JPEG and DOM-backed checks are in `docs/ux/evidence/task032p5/`; screenshot was visually inspected. Physical touch scrolling was not tested. No new full-suite/backend/device acceptance claim: this copy correction required no persistent data mutation. Existing parent device/fault/staging/user-sign-off/application-main gates remain open. No successor or hosted action.

## Source publication

Task candidate `dee77e3906d64eae0de6efa93cdbeff6fa6158e9` is pushed and independently verified with origin ls-remote. The canonical outcome publication includes documentation/evidence only; application code remains on the task branch behind the parent gates.

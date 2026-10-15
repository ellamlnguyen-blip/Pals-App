# TASK-032P5 Calendar copy handoff

Status: source committed for coordinator review; parent TASK-032 remains incomplete.

Changed the Calendar date selector's visible label from “Campus date” to “Date” and its accessible name from “Choose campus date” to “Choose date”. Removed the Week/Month “Scroll sideways to see all seven days.” paragraph and its now-unused hint CSS, including both media rules. The calendar scroll regions, focus styles, month minimum width, dates, filtering, and data behavior are unchanged.

Verification: `git diff --check` passed; scoped ESLint passed with its existing “Pages directory cannot be found” advisory; web `tsc --noEmit -p tsconfig.json` passed; Prettier check for both changed source files passed. No markup-mirroring test was added for this copy correction. Coordinator owns rendered checks, review, branch publication and shared records.

No backend, schema, authorization, hosted environment, or persistent data changed. This substage does not meet parent sign-off or release gates. Standard speed could not be configured or verified through the task tools.

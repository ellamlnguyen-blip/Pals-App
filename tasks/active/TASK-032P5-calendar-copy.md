# TASK-032P5 Calendar text correction

Status: bounded copy correction within incomplete TASK-032; publish contract before fresh implementation. User2026-10-14 browser comments request Date instead of Campus date and removal of Scroll sideways to see all seven days.

Change visible label to Date and input accessible name to Choose date. Remove shared Week/Month hint paragraph and only its unused CSS/media rules; keep actual calendar scroll regions/keyboard focus/grid dimensions, Day/Week/Month navigation, date bounds/UNC timezone, categories/previews and all data/auth/backend behavior unchanged. No new tests mirroring markup for this reversible copy change; scoped lint/typecheck and coordinator rendered label/hint/scroll-region checks are sufficient.

Fresh GPT-6 Sol/medium worker owns only calendar/calendar-client.tsx,calendar.css and agents/handoffs/TASK-032P5.md. Read AGENTS,this contract,TASK030/parentTASK032 relevant UX; root owns canonical records/runtime/CUA/review/publication. Preserve source28e7784(applicationP4e656) and main5037fd0/dirty shared checkout. Commit bounded source, stop with handoff. Root publishes reviewed source and docs-only main outcome, with explicit actual checks. No dependency/schema/backend/permission/hosted change, no user sign-off or parent completion/successor. Tools cannot configure/verify Standard speed.

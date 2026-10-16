# TASK-035 local status handoff

Date: 2026-10-16. Status: local UI candidate verified; parent task remains incomplete.

## Outcome

The Calendar and Pals browser comments were implemented on `agent/TASK-035-compact-controls`, starting from canonical contract main `10e54212e1c2505b0cd7649641f854ac91637e37` plus the exact reviewed TASK-034 local source `70537ad702d536013e711d75e64578db34cdc4ce`. The implementation and `agents/handoffs/TASK-035-UI.md` are remote verified at `287e3faba359dfd49c713abf1533efb06a6cb49d`. Canonical main receives only these status records while parent dependencies remain incomplete.

## Evidence

- `next build --webpack` passed, including TypeScript, in the disposable local runtime.
- Rendered Calendar and Pals at 1280, 767 and 375 CSS pixels; captured screenshots under `docs/ux/evidence/task035-local/` on the task branch. Both pages had no document horizontal overflow at 767 and 375px. At 767px, Calendar's legend, centered date, and tabs share a row; the Pals filter is beside the heading.
- Browser checks covered Month switching, year/major filter submission, Clear, and a preselected valid year outside the menu's default range. Accessibility snapshots exposed the hidden Calendar h1 and labeled groups and form controls.
- No schema, backend, auth, ranking, hosted or production change was made for TASK-035.

## Remaining work

Resolve the recorded TASK-032/033/034 final signoff and release gates. Then review TASK-035 against the accepted integrated dependencies before application-main integration. Publish and verify the resulting main SHA if that integration occurs. Until then TASK-035 remains active, with application code on its task branch only. No automatic successor is dispatched from this incomplete parent.

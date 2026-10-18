# TASK-041 — Owner photo gallery directly after bio

Status: ready for bounded local UI implementation. Start from the latest canonical main and merge the exact reviewed TASK-040 owner profile source `04ac5440428413d77a08a80d5c7e396b1969e1d7` before editing. TASK-040 and predecessor integration gates remain open.

## Request and scope

On the signed-in owner's `/profile` page, remove the visible `Photos` heading and `Edit photos (Optional)` control. Put the existing four-slot photo grid directly under the bio without the heading row. Preserve each photo's own edit action, view/edit dialog, ordering, removal, addition, private photo route, and owner-only access. Keep a meaningful accessible name for the gallery and move keyboard focus after photo operations to an available photo action, since the removed control currently receives focus.

This is presentation and focus management only. No schema, API, photo sharing, or peer-profile changes. The individual photo edit control should remain visible and usable at phone and desktop widths.

## Acceptance and handoff

Verify TypeScript/build, a rendered authenticated 527px phone view and desktop view, and opening an individual photo action. Check no horizontal overflow and no removed heading/button in the visible page. Record exact source SHA, evidence, preview limitations, and remaining predecessor gates in a handoff. Push task branch and independently verify remote SHA. This task does not itself authorize integration of unfinished predecessor application branches into canonical main; publish a status-only main receipt if those gates remain open.

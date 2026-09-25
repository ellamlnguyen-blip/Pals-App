# TASK-020B interaction plan — dependent draft

Status: final independent contract/design/security review clear against integrated A `8d3c895d9093918d209c4e9aed3535ab108f19ae`; canonical publication pending before B implementation dispatch.

The student screen adds one host-only caution panel at the current saved Hangout detail. It uses existing Pals blue/white surfaces, rounded panel geometry and Nunito typography. Its placement beside the plan and joining status makes the voluntary control available during coordination without turning size into a public badge.

Host states: under threshold, no size warning; at/above threshold, the exact ADR-0024 warning; joining open/closed, one desired-state control; pending, control disabled; confirmed RPC revision plus matching fresh authorized state, success; stale/unknown/revoked, no success claim and reload instruction. On revoked access, mask the mounted detail immediately before hard navigation. Ordinary attendees and map viewers never receive the authoritative hidden-member flag or count. Joining closure changes only future joins, so existing attendees retain current access. A gate-off or failed host-size read does not masquerade as “small”; it is a generic unavailable size check.

Discovery keeps the map and list coupled. The list copy names smaller-first ordering only when A's reviewed `ranking_mode` is `small_first`, retains chronological copy for `chronological`, and works when Mapbox tiles are unavailable. No marker, preview or Calendar surface shows a large-group badge. A two-read server check compares full ordered rows, ranking mode and gate epoch, discarding stale or differently ranked responses before the client receives them. Rapid pan/filter changes discard superseded responses as today.

At desktop width the warning and control fit the existing detail content grid. At 390px and 320px they stack with 44px targets and no horizontal scroll. Test light/dark colors, keyboard focus/status announcement, loading/empty/error/denied/gate-off/uncertain views, and real authenticated close/reopen and threshold changes. Shared tokens remain the source for color/spacing; no broad redesign.

# ADR-0035 — Emergency availability shutdown without Ella's session

Status: Proposed
Date: 2026-10-05
Scope: TASK-027 staging-first safety operation

## Problem

ADR-0029 makes Ella's genuine caller-session `set_pilot_policy` RPC the only availability/capability writer. ADR-0034 proposes live MFA for that RPC. If Ella's session or authenticator is unavailable during an incident, the normal availability-off action cannot run. Source-gate freezes can stop selected product operations but do not make the application unavailable to new verified students. A launch rollback must remain possible without weakening the normal caller path or inventing a recovery bypass.

## Narrow exception proposed

Extend the existing fixed-project, reviewed staging-control SQL runner with one unambiguously named emergency availability-off operation that may change only the single preexisting availability row from enabled=true to enabled=false at an exact expected revision. The operation name identifies the availability singleton because the audit table has no policy-key column; no arbitrary key is accepted. It can never enable availability, change capabilities, source gates, roles or accounts, and it has no client grant. Use the existing staging project/CLI/commit preflight, `private.pilot_lock_management(NULL,NULL,'availability')`, CAS, fresh request UUID, bounded incident reason, authorization reference, exact-payload retry and immutable `staging_control_audit` transaction. Under that lock, validate a prior request's exact payload before checking live enabled state and revision, so a successful shutdown is retryable. A committed migration may add only the emergency audit operation vocabulary and change the audit subject/target-shape CHECK to allow subject_id=NULL and gate_key=NULL for this operation while preserving manager/role/source-gate shapes; normal replay must not change availability. Record the singleton policy target and the shared database `postgres` session as administrative CLI provenance, not Ella's identity or a `pilot_management_audit` event. Require a separately recorded human authorization/executor/reviewer and read-only audit/state reconciliation if response is uncertain. Pin the actual new latest migration version in the runner preflight.

Normal enablement and routine shutdown remain Ella's caller-session `set_pilot_policy` actions. This exception exists only for one-way emergency shutdown when that session is unavailable. Restoring availability after recovery uses the normal caller path and full launch checks. No service-role client proxy, generic SQL console or factor bypass is authorized.

## Evidence and release boundary

Test exact true→false transition, revision increment, immutable audit with previous/new boolean values and exact revisions, exact retry after the first shutdown including expected revision in the payload, changed-payload/stale-state/wrong-target denial and no partial mutation in disposable SQL; verify no client role can execute or read private audit. Independent security review is required. Pals Staging is the only target for this contract; production needs separately reviewed adaptation before public cutover. Until an accepted and tested emergency path exists for the active release target, do not claim the rollback requirement complete.

## Acceptance

This is a deliberate exception to ADR-0029's no-SQL-policy-substitute rule and therefore needs explicit user acceptance under AGENTS.md. It authorizes no operation by itself.

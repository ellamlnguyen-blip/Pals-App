# ADR-0034 — MFA for launch policy management

Status: Accepted
Date: 2026-10-05
Scope: TASK-027 caller-session policy channel

## Problem

Accepted ADR-0031 requires MFA for privileged operator sessions/actions. The existing caller-bound `set_pilot_policy` RPC changes capability and availability gates after a live manager check, but `private.pilot_require_manager()` accepts AAL1. A manager with a password-only session can call this RPC directly through PostgREST, bypassing any MFA check added only to an admin web route. `set_pilot_account_admission` uses the same guard.

## Decision proposed

In one committed migration, require a genuinely signed AAL2 JWT, current owned unexpired AAL2 Auth session and current verified owned TOTP factor inside the shared manager authorization guard. Preserve active manager/account checks, CAS revisions, idempotent request receipts, immutable audit, existing policy-key allowlist and caller-derived identity. After the existing management lock path (pilot evidence and policy rows, account, manager/admission rows), lock TOTP factor then session and recheck their live state in a fresh READ COMMITTED statement after waits. The factor-before-session order must match TASK-027H. Do not add per-action UNC email/membership/campus rechecks; the user declined those in ADR-0033. The guard does not require the moderation source gate or a platform admin role. The normal `set_pilot_policy` RPC remains the only routine capability/availability writer, subject to ADR-0035's one-way emergency exception. Ordinary student actions and verified UNC access remain automatic and unaffected.

No service-role proxy, forged JWT, direct SQL gate substitute, per-action fresh TOTP challenge or recovery bypass is introduced. A valid operator AAL2 session can make multiple audited policy calls until its live authority expires or is revoked.

## Evidence required

With an active manager and all launch gates closed, actual-role SQL and genuine Auth HTTP tests must prove AAL1 denial, AAL2 success/audit for a permitted policy CAS, stale revision denial, manager/account/session/factor revocation denial (including cached AAL2 token), and no policy/audit mutation on denial. Check concurrent factor/session downgrade against policy operations. Verify ordinary confirmed UNC AAL1 app eligibility remains unchanged. Return disposable gates to false. Independent security review precedes staging.

If Ella loses her valid TOTP/session while gates are on, caller-session shutdown is unavailable. This proposal does not authorize a recovery bypass or a direct SQL policy substitute. Parent TASK-027 must establish a separately reviewed operational recovery/shutdown path before launch.

## Acceptance

The user accepted database-enforced manager MFA on 2026-10-05 and explicitly declined per-action UNC eligibility rechecks. The accepted scope above reflects both instructions. This decision does not grant a manager, enable gates, or authorize hosted writes.

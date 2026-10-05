# TASK-027 — Next steps to launch

Updated: 2026-10-05. TASK-027 remains incomplete; student invitations and public cutover are not ready.

## Current decision and verified preparation

- Active accounts with confirmed email on the exact existing UNC allowlist can use the app without a roster, completed profile or primary photo (Accepted ADR-0030). Keep unconfirmed, non-allowlisted, stale-email, inactive-campus, suspended and banned denials, RLS, consent, blocks and reports.
- Ella Nguyen (`ella_nguyen@unc.edu`) solely owns launch moderation. The backup requirement and earlier backup nominations are superseded. Keep operator MFA/recovery, audit and conflict checks; do not silently grant extra sanction authority.
- Nonproduction targets: Supabase Pals Staging `ffabdrgsmtfylrehwmfo`; Vercel team `pals8`, project `pals-app`; [TASK-027 Preview](https://pals-app-git-agent-task-027-open-unc-mvp-pals8.vercel.app).
- Preview health was freshly read with status ok and all six checks true. Its exact HTTPS callback and site URL, enabled confirmation, configured Resend SMTP and enabled TOTP provider were inspected. Prior UNC confirmation email delivery is recorded; this does not prove every sign-in/product flow.
- Docker is running. A supported preserved Supabase restart replaced the stale local Storage runtime with version 1.77.5. Actual local Auth/Storage now passes 1/1. Full Auth/web remains 3/4 due to repeated stale Hangout conflict retries; TASK-027D fixes that source defect. A diagnostic bypass proved downstream coverage but was restored and is not a complete pass.
- Reviewed TASK-027B prepares audited staging-only manager/moderator/source-gate controls. ADR-0029 remains Proposed pending acceptance; no hosted controls were executed. Staging availability, capabilities and source gates remain off. Ella has no manager/operator role and no verified TOTP or AAL2 session in the latest read.
- Existing Vercel Git integration automatically rebuilds main, including documentation pushes. These builds do not constitute verified MVP production release. No production database access change or usepals.com cutover occurred.

## Remaining sequence

1. **Finish local source verification.** Review TASK-027C/D corrections; prove stale edits return prompt conflict with unchanged data, real in-flight revocation remains protected, and migration/RLS, Auth/Storage, lifecycle, lint/type/unit/build checks pass against the final reviewed source.
2. **Accept the prepared operator designs.** ADR-0029 is the reviewed staging bootstrap path. ADR-0031 proposes hosted MFA moderation. Choose Ella's exact role: moderator handles review/suspension/Hangout disabling; admin additionally handles bans/reinstatement. AGENTS requires explicit acceptance of these authorization designs before their hosted implementation/execution.
3. **Complete operator controls and recovery.** Implement/review hosted admin HTTPS and genuine AAL2 checks, caller-bound policy-control UI and emergency shutdown path. Ella completes personal TOTP enrollment/challenge and recovery verification. Record report response, retention, incident contact and conflict handling honestly; no standing backup is required.
4. **Provision only the exact staging target.** Apply reviewed inert audit migration through normal migration tooling; use distinct audited requests for approved Ella manager/operator assignment. Verify target, identity, live roles and audit; keep gates off until controls and rollback are tested.
5. **Enable the staging MVP and smoke it.** Use Ella's real authenticated policy operation and reviewed source controls. Enable Hangouts/discovery, Calendar, People/friendship, chat, DMs, notifications, attendance and profile enrichment. Keep external analytics capture and large-Hangout safeguards off. Prove confirmation/sign-in, empty-profile access, all retained account denials, Hangout creation/joining/discovery, friendships, chat/DM requests, notifications, attendance, blocking/reporting, moderator queue/action/audit and revocation on the exact Preview.
6. **Review and integrate the verified release.** Clean controlled fixtures without erasing required audit. Publish handoff and evidence, integrate accepted code into main, push and verify exact remote SHA. A task-branch push or green configuration health alone is insufficient.
7. **Release and cut over usepals.com.** Independently verify production targets, migrations, SMTP, exact callbacks, recovery and gate state. Deploy the tested build, smoke health/auth/safety, then attach usepals.com and update reviewed DNS records. Verify TLS, redirects, callback and retained denial boundaries. Record rollback and monitor reports/errors before invitations.

## Required user participation

Accept the two concrete authorization proposals and choose Ella's sanction role. Ella must personally enroll/control her authenticator and verify recovery. No password, token or authenticator secret should be posted in chat. The disabled Vercel device-login page is a tooling obstacle; the signed-in dashboard and Git deployment path remain available for independent work.

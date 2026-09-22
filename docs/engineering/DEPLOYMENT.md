# Deployment and Environments
Web/admin on Vercel; backend/data on Supabase.

Environments: local, staging, production.
Rules: no production-first development; no dashboard-only schema changes; migrations move through environments; secrets are environment-scoped; service-role keys are server-only.

## Purchased Domain Cutover
The purchased domain currently points to another deployment. Leave its DNS configuration untouched during development.

Cutover plan: deploy Pals to a temporary Vercel URL, validate it, inventory the current DNS records and provider configuration, attach the domain to the Pals Vercel project, update only the required DNS records, verify SSL/canonical redirects/auth callbacks, monitor the cutover, and remove obsolete bindings only after the Pals domain is confirmed healthy.

Re-check the current provider/configuration before executing the cutover.

## Foundation environment workflow

TASK-002 adds local Supabase configuration, loopback network setup, migration/reset/pgTAP scripts and a separate database CI job. The authorized hosted development/staging target and evidence are in `docs/operations/HOSTED_ENVIRONMENT.md`; production is never an implicit fallback. TASK-003 connects the environment target validator before constructing every app provider client.

Auth web deployments need explicit `APP_ENV`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, a publishable/anon key and HTTPS `APP_ORIGIN`. Set the exact `/auth/callback` URL in the hosted Auth redirect allowlist; never wildcard arbitrary preview origins. Configure SMTP for real UNC recipients before testing delivery. Local config is not proof of hosted Auth/API settings, and local email-test rate limits must not be deployed. Verify confirmation→callback→onboarding→ready, resend, signin/signout and restriction gates on the actual deployed HTTPS origin before closing the staging-callback criterion. No domain cutover is included in TASK-003.

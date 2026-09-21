# Deployment and Environments
Web/admin on Vercel; backend/data on Supabase.

Environments: local, staging, production.
Rules: no production-first development; no dashboard-only schema changes; migrations move through environments; secrets are environment-scoped; service-role keys are server-only.

## Purchased Domain Cutover
The purchased domain currently points to another deployment. Leave its DNS configuration untouched during development.

Cutover plan: deploy Pals to a temporary Vercel URL, validate it, inventory the current DNS records and provider configuration, attach the domain to the Pals Vercel project, update only the required DNS records, verify SSL/canonical redirects/auth callbacks, monitor the cutover, and remove obsolete bindings only after the Pals domain is confirmed healthy.

Re-check the current provider/configuration before executing the cutover.

# ADR-0038 — Calendar categories and profile account navigation

Status: Proposed implementation record; requested product behavior is explicitly directed by the user on 2026-10-13. No new authorization, schema, identity provider or hosted configuration is proposed or accepted here.

## Context and proposal

The reference screens and explicit request move owner utilities from an avatar dropdown to the bottom of the owner's profile and introduce a dedicated account editor using existing Supabase Auth. Calendar uses independent Hosting/Attending/All hangouts categories and Day/Week/Month views; blue identifies other available plans. Preserve existing caller authorization, UNC verification, owner revisions, personal cancelled visibility, source rechecks and join outcomes. Use two sentences for new/changed profile bios as the disclosed interpretation of the user's incomplete sentence-count wording.

This is a cross-surface interaction proposal, recorded under the repository cross-cutting rule. TASK-030 may implement the explicitly requested UI and existing-provider APIs without changing an auth strategy or permission policy. Any necessary major identity/privacy/schema/provider change requires a separate concrete proposal and explicit acceptance before execution. Do not treat this Proposed record as permission for those operations.

## Consequences

No SQL migration or retroactive bio rewrite. App writes enforce the bio sentence limit; current database character constraints remain authoritative at the database boundary. Pending email never substitutes for confirmed live UNC email evidence. No provider security settings are modified. Application main integration and hosted release keep the existing parent acceptance gates.

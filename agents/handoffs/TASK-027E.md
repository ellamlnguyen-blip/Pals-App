# TASK-027E — Local Storage runtime compatibility

Date: 2026-10-05
Scope: nonproduction local runtime only; no app/schema permission change or hosted operation.

## Cause and correction

Supabase CLI service-image selection is checkout scoped. The recovered linked checkout recorded Storage `v1.77.5` in ignored `supabase/.temp/storage-version`; the isolated test checkout initially had no pin and used default `v1.72.1`. Reset migrations and the retained running container could therefore come from different releases. Inspecting actual Docker image metadata, rather than the planned service list, confirmed the mismatch. Version 1.77.5's provider migration 0066 creates the `(bucket_id, name COLLATE "C") WHERE archived_at IS NULL` unique index its API expects.

The coordinator copied only the nonsecret Storage version file into the test checkout, used an official clean local reset, then official preserved stop/start from that same checkout. Actual container inspection confirmed `public.ecr.aws/supabase/storage-api:v1.77.5`. Provider migrations generated the matching index. No manual index/schema patch, application migration workaround or provider replacement occurred. Other service metadata and secrets were not copied.

## Evidence

- Official Storage tag v1.77.5: `2f89775ead04da4b681da3b15d39f129366719ac`, migrations/tenant/0066 and src/storage/database/pg.ts 1103–1105.
- Official CLI tag v2.117.0: `21db855916f2c2b12f61cde923a27094b8528b23`, Go config.go service-version readers and start.go initStorageJob.
- Read-only independent source review agrees with the diagnosis and flags durability: the version file is ignored, so each fresh checkout must carry matching runtime metadata and verify actual container images. Fresh agent creation was rejected twice by the tool's thread limit; no new source implementation was made. The coordinator performed runtime coordination and an existing independent reviewer checked the source evidence.
- Actual Auth/Storage passed 1/1 and full Auth/web passed 4/4 after the correction, including strict stale edit conflict and the real-response in-flight suspension barrier.
- A subsequent matching-version db:verify passed two clean resets, 1,678 assertions across 26 files per run, and schema lint. Auth/Storage after these resets passed 1/1 and full Auth/web passed 4/4 again, without skipped assertions.
- pnpm check passed formatting, lint, typecheck, all 49 unit tests with no skip, and both web/admin builds. One inherited changelog formatting issue was corrected by the coordinator; no application source changed after reviewed TASK-027D commit c3b86bab604fc1ff34a179a2db34ff244ace8850.

## Repeatability and remaining boundary

Use the same explicit official service-version metadata when starting and resetting the shared local project. Verify `docker inspect` image metadata; a CLI planned-service list does not prove what an existing container runs. Reapply/refresh the nonsecret release pin for fresh worktrees before tests; never patch provider-managed indexes to compensate. Local proof does not substitute for staging upload/product smoke. Hosted operator designs, roles, MFA/recovery, policy controls, gated access and public release remain incomplete.

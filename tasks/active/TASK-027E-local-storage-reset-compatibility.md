# TASK-027E — Local Storage reset compatibility

Status: In progress
Date: 2026-10-05
Parent: TASK-027

Diagnose the supported local Supabase runtime incompatibility reproduced after clean database replay: CLI 2.117.0, Storage v1.77.5, upload fails PostgreSQL 42P10 because its ON CONFLICT name COLLATE C arbiter does not match current idx_objects_current_version `(bucket_id,name) WHERE archived_at IS NULL`. An earlier supported preserved stop/start yielded Auth/Storage 1/1, but the fresh reset plus preserved restart now reproduces failure. Do not claim a durable fix from the earlier receipt.

Read current AGENTS, current TASK-027 access contract, local Supabase config, exact installed CLI/runtime metadata and primary official source/docs. Assess official supported version/configuration/reset sequence and prove a repeatable fresh-reset upload if a compatible path exists. No provider-managed schema/index patch, applied migration edit, hosted write, new provider or credential exposure. Do not change application permissions, source guards or product scope. A project dependency/config change must be narrowly justified, reviewed and committed; explain any major decision before implementation.

Coordinate exclusive Docker/database access with TASK-027D. D owns until its static checks and final handoff release; read-only source research may proceed now. Do not recreate broad local volumes or purge data; use preserved official operations. Log only metadata, never full local Auth keys/Env/status. Actual disposable upload/ownership and Auth/web lifecycle must run without skipped assertions once runtime is compatible. If a supported path is unavailable, record exact evidence and blocker rather than hiding it.

Write handoff with version/digest/schema/error evidence and repeatability results, commit/push any accepted in-scope work and verify remote SHA. Stop for coordinator review. Parent stays incomplete pending hosted smoke and moderator operations.

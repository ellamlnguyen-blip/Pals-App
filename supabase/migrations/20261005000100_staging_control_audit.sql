-- Administrative evidence only. Ordinary migration replay grants no authority or gate.
begin;
create table private.staging_control_audit (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 operation text not null check(operation in ('first_manager','revoke_manager','grant_moderator','revoke_moderator','source_gate')),
 subject_id uuid,
 gate_key text,
 previous_value jsonb,
 new_value jsonb not null,
 previous_revision bigint,
 new_revision bigint,
 reason text not null check(length(reason) between 1 and 2000),
 authorization_ref text not null check(length(authorization_ref) between 1 and 200),
 credential_ref text not null check(length(credential_ref) between 1 and 200),
 -- Management API SQL uses a shared database login. These are database facts,
 -- not evidence of a unique human executor.
 executor_session_user text not null,
 executor_backend_pid integer not null,
 occurred_at timestamptz not null default clock_timestamp(),
 check ((subject_id is not null) = (operation <> 'source_gate')),
 check ((gate_key is not null) = (operation = 'source_gate'))
);
alter table private.staging_control_audit enable row level security;
revoke all on private.staging_control_audit from public, anon, authenticated, service_role;
create trigger staging_control_audit_immutable before update or delete on private.staging_control_audit
 for each row execute function private.reject_pilot_evidence_change();
commit;

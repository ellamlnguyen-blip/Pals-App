-- ADR-0035: audit vocabulary only. Replay cannot change availability.
begin;
alter table private.staging_control_audit drop constraint staging_control_audit_operation_check;
alter table private.staging_control_audit add constraint staging_control_audit_operation_check
  check (operation in ('first_manager','revoke_manager','grant_moderator','revoke_moderator','grant_admin','revoke_admin','source_gate','emergency_availability_off'));
alter table private.staging_control_audit drop constraint staging_control_audit_check;
alter table private.staging_control_audit add constraint staging_control_audit_check
  check ((subject_id is not null) = (operation not in ('source_gate','emergency_availability_off')));
alter table private.staging_control_audit drop constraint staging_control_audit_check1;
alter table private.staging_control_audit add constraint staging_control_audit_check1
  check ((gate_key is not null) = (operation = 'source_gate'));
commit;

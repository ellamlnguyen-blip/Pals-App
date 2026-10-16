-- Expand only the immutable audit action vocabulary. Ordinary replay grants no role.
begin;
alter table private.staging_control_audit
  drop constraint staging_control_audit_operation_check;
alter table private.staging_control_audit
  add constraint staging_control_audit_operation_check
  check (operation in ('first_manager','revoke_manager','grant_moderator','revoke_moderator','grant_admin','revoke_admin','source_gate'));
commit;

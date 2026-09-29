// Dormant normalized failure wire. Literal source manifests; no fixture imports,
// runtime registration, target access, source evaluation or success authority.
import { createHash } from "node:crypto";
import { types as nativeTypes } from "node:util";
// Separate future adopters must propagate this reserved module exit whenever a
// writer receipt is unavailable; it invalidates earlier otherwise valid frames.
export const genericWireUnavailableExit = 78;
export const genericFailureLimits = Object.freeze({
  frame: 65536,
  records: 16,
  total: 1048576,
  differences: 128,
  depth: 16,
  nodes: 4096,
  count: 1000000,
  write: 2000,
  exit: 5000,
});
const freeze = (v) => {
  if (v && typeof v === "object") {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};
export const failureWireManifest = freeze({
  modules: {
    "pilot-admission-current-safety-concurrency.integration.mjs": {
      sha256:
        "4126c80132c8a644986dfe28f7640b87c3a2555a175f252782e220306bfc3582",
      hours: 36,
      cases: [
        {
          id: "L2.CH.availability_off.loss-first",
          route: "CH",
          loss: "availability_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.availability_off.operation-first",
          route: "CH",
          loss: "availability_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.availability_missing.loss-first",
          route: "CH",
          loss: "availability_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.availability_missing.operation-first",
          route: "CH",
          loss: "availability_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.purpose_off.loss-first",
          route: "CH",
          loss: "purpose_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.purpose_off.operation-first",
          route: "CH",
          loss: "purpose_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.purpose_missing.loss-first",
          route: "CH",
          loss: "purpose_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.purpose_missing.operation-first",
          route: "CH",
          loss: "purpose_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.source_gate_off.loss-first",
          route: "CH",
          loss: "source_gate_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.source_gate_off.operation-first",
          route: "CH",
          loss: "source_gate_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.source_gate_missing.loss-first",
          route: "CH",
          loss: "source_gate_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.source_gate_missing.operation-first",
          route: "CH",
          loss: "source_gate_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.safety_gate_off.loss-first",
          route: "CH",
          loss: "safety_gate_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.safety_gate_off.operation-first",
          route: "CH",
          loss: "safety_gate_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.safety_gate_missing.loss-first",
          route: "CH",
          loss: "safety_gate_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.safety_gate_missing.operation-first",
          route: "CH",
          loss: "safety_gate_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.actor.roster_revoke.loss-first",
          route: "CH",
          subject: "actor",
          loss: "roster_revoke",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.actor.roster_revoke.operation-first",
          route: "CH",
          subject: "actor",
          loss: "roster_revoke",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.actor.roster_delete.loss-first",
          route: "CH",
          subject: "actor",
          loss: "roster_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.actor.roster_delete.operation-first",
          route: "CH",
          subject: "actor",
          loss: "roster_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.immutable_host.roster_revoke.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "roster_revoke",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.immutable_host.roster_revoke.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "roster_revoke",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.immutable_host.roster_delete.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "roster_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CH.immutable_host.roster_delete.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "roster_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.availability_off.loss-first",
          route: "CP",
          loss: "availability_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.availability_off.operation-first",
          route: "CP",
          loss: "availability_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.availability_missing.loss-first",
          route: "CP",
          loss: "availability_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.availability_missing.operation-first",
          route: "CP",
          loss: "availability_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.purpose_off.loss-first",
          route: "CP",
          loss: "purpose_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.purpose_off.operation-first",
          route: "CP",
          loss: "purpose_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.purpose_missing.loss-first",
          route: "CP",
          loss: "purpose_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.purpose_missing.operation-first",
          route: "CP",
          loss: "purpose_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.source_gate_off.loss-first",
          route: "CP",
          loss: "source_gate_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.source_gate_off.operation-first",
          route: "CP",
          loss: "source_gate_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.source_gate_missing.loss-first",
          route: "CP",
          loss: "source_gate_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.source_gate_missing.operation-first",
          route: "CP",
          loss: "source_gate_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.safety_gate_off.loss-first",
          route: "CP",
          loss: "safety_gate_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.safety_gate_off.operation-first",
          route: "CP",
          loss: "safety_gate_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.safety_gate_missing.loss-first",
          route: "CP",
          loss: "safety_gate_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.safety_gate_missing.operation-first",
          route: "CP",
          loss: "safety_gate_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.actor.roster_revoke.loss-first",
          route: "CP",
          subject: "actor",
          loss: "roster_revoke",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.actor.roster_revoke.operation-first",
          route: "CP",
          subject: "actor",
          loss: "roster_revoke",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.actor.roster_delete.loss-first",
          route: "CP",
          subject: "actor",
          loss: "roster_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.actor.roster_delete.operation-first",
          route: "CP",
          subject: "actor",
          loss: "roster_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.peer.roster_revoke.loss-first",
          route: "CP",
          subject: "peer",
          loss: "roster_revoke",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.peer.roster_revoke.operation-first",
          route: "CP",
          subject: "peer",
          loss: "roster_revoke",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.peer.roster_delete.loss-first",
          route: "CP",
          subject: "peer",
          loss: "roster_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CP.peer.roster_delete.operation-first",
          route: "CP",
          subject: "peer",
          loss: "roster_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.availability_off.loss-first",
          route: "CB",
          loss: "availability_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.availability_off.operation-first",
          route: "CB",
          loss: "availability_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.availability_missing.loss-first",
          route: "CB",
          loss: "availability_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.availability_missing.operation-first",
          route: "CB",
          loss: "availability_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.purpose_off.loss-first",
          route: "CB",
          loss: "purpose_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.purpose_off.operation-first",
          route: "CB",
          loss: "purpose_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.purpose_missing.loss-first",
          route: "CB",
          loss: "purpose_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.purpose_missing.operation-first",
          route: "CB",
          loss: "purpose_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.source_gate_off.loss-first",
          route: "CB",
          loss: "source_gate_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.source_gate_off.operation-first",
          route: "CB",
          loss: "source_gate_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.source_gate_missing.loss-first",
          route: "CB",
          loss: "source_gate_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.source_gate_missing.operation-first",
          route: "CB",
          loss: "source_gate_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.safety_gate_off.loss-first",
          route: "CB",
          loss: "safety_gate_off",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.safety_gate_off.operation-first",
          route: "CB",
          loss: "safety_gate_off",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.safety_gate_missing.loss-first",
          route: "CB",
          loss: "safety_gate_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.safety_gate_missing.operation-first",
          route: "CB",
          loss: "safety_gate_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.actor.roster_revoke.loss-first",
          route: "CB",
          subject: "actor",
          loss: "roster_revoke",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.actor.roster_revoke.operation-first",
          route: "CB",
          subject: "actor",
          loss: "roster_revoke",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.actor.roster_delete.loss-first",
          route: "CB",
          subject: "actor",
          loss: "roster_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.actor.roster_delete.operation-first",
          route: "CB",
          subject: "actor",
          loss: "roster_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.peer.roster_revoke.loss-first",
          route: "CB",
          subject: "peer",
          loss: "roster_revoke",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.peer.roster_revoke.operation-first",
          route: "CB",
          subject: "peer",
          loss: "roster_revoke",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.peer.roster_delete.loss-first",
          route: "CB",
          subject: "peer",
          loss: "roster_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L2.CB.peer.roster_delete.operation-first",
          route: "CB",
          subject: "peer",
          loss: "roster_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
      ],
      phases: [
        "holder-execution",
        "waiter-execution",
        "observe-required-wait",
        "release-and-assert-outcome",
        "independent-case-setup",
        "eligible-current-precheck",
        "race",
        "post-loss-current-control",
        "success-evidence",
        "guarded-case-reset",
      ],
      partitions: [
        "actual-observed-wait-required",
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
        "owned-exit-unproven",
        "cleanup-failed",
      ],
    },
    "pilot-admission-current-safety-absence.integration.mjs": {
      sha256:
        "c974ff7e36172db3b1518642ab69ce90afee2fb0575168f58ad00860635d8e59",
      hours: 12,
      cases: [
        {
          id: "L4.CH.availability_missing.serial",
          route: "CH",
          loss: "availability_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CH.purpose_missing.serial",
          route: "CH",
          loss: "purpose_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CH.source_gate_missing.serial",
          route: "CH",
          loss: "source_gate_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CH.safety_gate_missing.serial",
          route: "CH",
          loss: "safety_gate_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CH.actor.roster_missing.serial",
          route: "CH",
          loss: "actor.roster_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CH.immutable_host.roster_missing.serial",
          route: "CH",
          loss: "immutable_host.roster_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CH.actor.activate_later",
          route: "CH",
          subject: "actor",
          partition: "serial-authorized-manager-activation-after-denial",
        },
        {
          id: "L4.CH.immutable_host.activate_later",
          route: "CH",
          subject: "immutable_host",
          partition: "serial-authorized-manager-activation-after-denial",
        },
        {
          id: "L4.CP.availability_missing.serial",
          route: "CP",
          loss: "availability_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CP.purpose_missing.serial",
          route: "CP",
          loss: "purpose_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CP.source_gate_missing.serial",
          route: "CP",
          loss: "source_gate_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CP.safety_gate_missing.serial",
          route: "CP",
          loss: "safety_gate_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CP.actor.roster_missing.serial",
          route: "CP",
          loss: "actor.roster_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CP.peer.roster_missing.serial",
          route: "CP",
          loss: "peer.roster_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CP.actor.activate_later",
          route: "CP",
          subject: "actor",
          partition: "serial-authorized-manager-activation-after-denial",
        },
        {
          id: "L4.CP.peer.activate_later",
          route: "CP",
          subject: "peer",
          partition: "serial-authorized-manager-activation-after-denial",
        },
        {
          id: "L4.CB.availability_missing.serial",
          route: "CB",
          loss: "availability_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CB.purpose_missing.serial",
          route: "CB",
          loss: "purpose_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CB.source_gate_missing.serial",
          route: "CB",
          loss: "source_gate_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CB.safety_gate_missing.serial",
          route: "CB",
          loss: "safety_gate_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CB.actor.roster_missing.serial",
          route: "CB",
          loss: "actor.roster_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CB.peer.roster_missing.serial",
          route: "CB",
          loss: "peer.roster_missing",
          partition: "serial-absence-denial",
        },
        {
          id: "L4.CB.actor.activate_later",
          route: "CB",
          subject: "actor",
          partition: "serial-authorized-manager-activation-after-denial",
        },
        {
          id: "L4.CB.peer.activate_later",
          route: "CB",
          subject: "peer",
          partition: "serial-authorized-manager-activation-after-denial",
        },
      ],
      phases: [
        "independent-case-setup",
        "eligible-precheck",
        "absence-denial",
        "manager-activation",
        "privileged-replacement",
        "guarded-case-reset",
      ],
      partitions: [
        "serial-absence-denial",
        "serial-authorized-manager-activation-after-denial",
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
        "cleanup-failed",
        "owned-exit-unproven",
      ],
    },
    "pilot-admission-current-safety-identity-races.integration.mjs": {
      sha256:
        "ea04428dd1ae5c5fddf6bd1fbe6e0cff074e85b5aecf5de571d5f45296fde4d2",
      hours: 96,
      cases: [
        {
          id: "L3.CH.actor.suspended.loss-first",
          route: "CH",
          subject: "actor",
          loss: "suspended",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.suspended.operation-first",
          route: "CH",
          subject: "actor",
          loss: "suspended",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.banned.loss-first",
          route: "CH",
          subject: "actor",
          loss: "banned",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.banned.operation-first",
          route: "CH",
          subject: "actor",
          loss: "banned",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.email_confirmation.loss-first",
          route: "CH",
          subject: "actor",
          loss: "email_confirmation",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.email_confirmation.operation-first",
          route: "CH",
          subject: "actor",
          loss: "email_confirmation",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.email_domain.loss-first",
          route: "CH",
          subject: "actor",
          loss: "email_domain",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.email_domain.operation-first",
          route: "CH",
          subject: "actor",
          loss: "email_domain",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.email_equality.loss-first",
          route: "CH",
          subject: "actor",
          loss: "email_equality",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.email_equality.operation-first",
          route: "CH",
          subject: "actor",
          loss: "email_equality",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_verification.loss-first",
          route: "CH",
          subject: "actor",
          loss: "membership_verification",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_verification.operation-first",
          route: "CH",
          subject: "actor",
          loss: "membership_verification",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_delete.loss-first",
          route: "CH",
          subject: "actor",
          loss: "membership_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_delete.operation-first",
          route: "CH",
          subject: "actor",
          loss: "membership_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_campus.loss-first",
          route: "CH",
          subject: "actor",
          loss: "membership_campus",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_campus.operation-first",
          route: "CH",
          subject: "actor",
          loss: "membership_campus",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.campus_active.loss-first",
          route: "CH",
          subject: "actor",
          loss: "campus_active",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.campus_active.operation-first",
          route: "CH",
          subject: "actor",
          loss: "campus_active",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.campus_unc.loss-first",
          route: "CH",
          subject: "actor",
          loss: "campus_unc",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.campus_unc.operation-first",
          route: "CH",
          subject: "actor",
          loss: "campus_unc",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.campus_allowlist.loss-first",
          route: "CH",
          subject: "actor",
          loss: "campus_allowlist",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.campus_allowlist.operation-first",
          route: "CH",
          subject: "actor",
          loss: "campus_allowlist",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_missing.loss-first",
          route: "CH",
          subject: "actor",
          loss: "profile_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_missing.operation-first",
          route: "CH",
          subject: "actor",
          loss: "profile_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_required.loss-first",
          route: "CH",
          subject: "actor",
          loss: "profile_required",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_required.operation-first",
          route: "CH",
          subject: "actor",
          loss: "profile_required",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_primary.loss-first",
          route: "CH",
          subject: "actor",
          loss: "profile_primary",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_primary.operation-first",
          route: "CH",
          subject: "actor",
          loss: "profile_primary",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.object_detach_delete.loss-first",
          route: "CH",
          subject: "actor",
          loss: "object_detach_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.object_detach_delete.operation-first",
          route: "CH",
          subject: "actor",
          loss: "object_detach_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_delete_replace.loss-first",
          route: "CH",
          subject: "actor",
          loss: "membership_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.membership_delete_replace.operation-first",
          route: "CH",
          subject: "actor",
          loss: "membership_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_delete_replace.loss-first",
          route: "CH",
          subject: "actor",
          loss: "profile_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.actor.profile_delete_replace.operation-first",
          route: "CH",
          subject: "actor",
          loss: "profile_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.suspended.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "suspended",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.suspended.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "suspended",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.banned.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "banned",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.banned.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "banned",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.email_confirmation.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "email_confirmation",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.email_confirmation.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "email_confirmation",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.email_domain.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "email_domain",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.email_domain.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "email_domain",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.email_equality.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "email_equality",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.email_equality.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "email_equality",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_verification.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_verification",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_verification.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_verification",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_delete.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_delete.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_campus.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_campus",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_campus.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_campus",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.campus_active.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "campus_active",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.campus_active.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "campus_active",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.campus_unc.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "campus_unc",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.campus_unc.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "campus_unc",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.campus_allowlist.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "campus_allowlist",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.campus_allowlist.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "campus_allowlist",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_missing.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_missing.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_required.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_required",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_required.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_required",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_primary.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_primary",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_primary.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_primary",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.object_detach_delete.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "object_detach_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.object_detach_delete.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "object_detach_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_delete_replace.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.membership_delete_replace.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "membership_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_delete_replace.loss-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CH.immutable_host.profile_delete_replace.operation-first",
          route: "CH",
          subject: "immutable_host",
          loss: "profile_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.suspended.loss-first",
          route: "CP",
          subject: "actor",
          loss: "suspended",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.suspended.operation-first",
          route: "CP",
          subject: "actor",
          loss: "suspended",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.banned.loss-first",
          route: "CP",
          subject: "actor",
          loss: "banned",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.banned.operation-first",
          route: "CP",
          subject: "actor",
          loss: "banned",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.email_confirmation.loss-first",
          route: "CP",
          subject: "actor",
          loss: "email_confirmation",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.email_confirmation.operation-first",
          route: "CP",
          subject: "actor",
          loss: "email_confirmation",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.email_domain.loss-first",
          route: "CP",
          subject: "actor",
          loss: "email_domain",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.email_domain.operation-first",
          route: "CP",
          subject: "actor",
          loss: "email_domain",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.email_equality.loss-first",
          route: "CP",
          subject: "actor",
          loss: "email_equality",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.email_equality.operation-first",
          route: "CP",
          subject: "actor",
          loss: "email_equality",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_verification.loss-first",
          route: "CP",
          subject: "actor",
          loss: "membership_verification",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_verification.operation-first",
          route: "CP",
          subject: "actor",
          loss: "membership_verification",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_delete.loss-first",
          route: "CP",
          subject: "actor",
          loss: "membership_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_delete.operation-first",
          route: "CP",
          subject: "actor",
          loss: "membership_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_campus.loss-first",
          route: "CP",
          subject: "actor",
          loss: "membership_campus",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_campus.operation-first",
          route: "CP",
          subject: "actor",
          loss: "membership_campus",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.campus_active.loss-first",
          route: "CP",
          subject: "actor",
          loss: "campus_active",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.campus_active.operation-first",
          route: "CP",
          subject: "actor",
          loss: "campus_active",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.campus_unc.loss-first",
          route: "CP",
          subject: "actor",
          loss: "campus_unc",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.campus_unc.operation-first",
          route: "CP",
          subject: "actor",
          loss: "campus_unc",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.campus_allowlist.loss-first",
          route: "CP",
          subject: "actor",
          loss: "campus_allowlist",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.campus_allowlist.operation-first",
          route: "CP",
          subject: "actor",
          loss: "campus_allowlist",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_missing.loss-first",
          route: "CP",
          subject: "actor",
          loss: "profile_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_missing.operation-first",
          route: "CP",
          subject: "actor",
          loss: "profile_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_required.loss-first",
          route: "CP",
          subject: "actor",
          loss: "profile_required",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_required.operation-first",
          route: "CP",
          subject: "actor",
          loss: "profile_required",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_primary.loss-first",
          route: "CP",
          subject: "actor",
          loss: "profile_primary",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_primary.operation-first",
          route: "CP",
          subject: "actor",
          loss: "profile_primary",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.object_detach_delete.loss-first",
          route: "CP",
          subject: "actor",
          loss: "object_detach_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.object_detach_delete.operation-first",
          route: "CP",
          subject: "actor",
          loss: "object_detach_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_delete_replace.loss-first",
          route: "CP",
          subject: "actor",
          loss: "membership_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.membership_delete_replace.operation-first",
          route: "CP",
          subject: "actor",
          loss: "membership_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_delete_replace.loss-first",
          route: "CP",
          subject: "actor",
          loss: "profile_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.actor.profile_delete_replace.operation-first",
          route: "CP",
          subject: "actor",
          loss: "profile_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.suspended.loss-first",
          route: "CP",
          subject: "peer",
          loss: "suspended",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.suspended.operation-first",
          route: "CP",
          subject: "peer",
          loss: "suspended",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.banned.loss-first",
          route: "CP",
          subject: "peer",
          loss: "banned",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.banned.operation-first",
          route: "CP",
          subject: "peer",
          loss: "banned",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.email_confirmation.loss-first",
          route: "CP",
          subject: "peer",
          loss: "email_confirmation",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.email_confirmation.operation-first",
          route: "CP",
          subject: "peer",
          loss: "email_confirmation",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.email_domain.loss-first",
          route: "CP",
          subject: "peer",
          loss: "email_domain",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.email_domain.operation-first",
          route: "CP",
          subject: "peer",
          loss: "email_domain",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.email_equality.loss-first",
          route: "CP",
          subject: "peer",
          loss: "email_equality",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.email_equality.operation-first",
          route: "CP",
          subject: "peer",
          loss: "email_equality",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_verification.loss-first",
          route: "CP",
          subject: "peer",
          loss: "membership_verification",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_verification.operation-first",
          route: "CP",
          subject: "peer",
          loss: "membership_verification",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_delete.loss-first",
          route: "CP",
          subject: "peer",
          loss: "membership_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_delete.operation-first",
          route: "CP",
          subject: "peer",
          loss: "membership_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_campus.loss-first",
          route: "CP",
          subject: "peer",
          loss: "membership_campus",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_campus.operation-first",
          route: "CP",
          subject: "peer",
          loss: "membership_campus",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.campus_active.loss-first",
          route: "CP",
          subject: "peer",
          loss: "campus_active",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.campus_active.operation-first",
          route: "CP",
          subject: "peer",
          loss: "campus_active",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.campus_unc.loss-first",
          route: "CP",
          subject: "peer",
          loss: "campus_unc",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.campus_unc.operation-first",
          route: "CP",
          subject: "peer",
          loss: "campus_unc",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.campus_allowlist.loss-first",
          route: "CP",
          subject: "peer",
          loss: "campus_allowlist",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.campus_allowlist.operation-first",
          route: "CP",
          subject: "peer",
          loss: "campus_allowlist",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_missing.loss-first",
          route: "CP",
          subject: "peer",
          loss: "profile_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_missing.operation-first",
          route: "CP",
          subject: "peer",
          loss: "profile_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_required.loss-first",
          route: "CP",
          subject: "peer",
          loss: "profile_required",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_required.operation-first",
          route: "CP",
          subject: "peer",
          loss: "profile_required",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_primary.loss-first",
          route: "CP",
          subject: "peer",
          loss: "profile_primary",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_primary.operation-first",
          route: "CP",
          subject: "peer",
          loss: "profile_primary",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.object_detach_delete.loss-first",
          route: "CP",
          subject: "peer",
          loss: "object_detach_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.object_detach_delete.operation-first",
          route: "CP",
          subject: "peer",
          loss: "object_detach_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_delete_replace.loss-first",
          route: "CP",
          subject: "peer",
          loss: "membership_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.membership_delete_replace.operation-first",
          route: "CP",
          subject: "peer",
          loss: "membership_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_delete_replace.loss-first",
          route: "CP",
          subject: "peer",
          loss: "profile_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CP.peer.profile_delete_replace.operation-first",
          route: "CP",
          subject: "peer",
          loss: "profile_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.suspended.loss-first",
          route: "CB",
          subject: "actor",
          loss: "suspended",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.suspended.operation-first",
          route: "CB",
          subject: "actor",
          loss: "suspended",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.banned.loss-first",
          route: "CB",
          subject: "actor",
          loss: "banned",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.banned.operation-first",
          route: "CB",
          subject: "actor",
          loss: "banned",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.email_confirmation.loss-first",
          route: "CB",
          subject: "actor",
          loss: "email_confirmation",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.email_confirmation.operation-first",
          route: "CB",
          subject: "actor",
          loss: "email_confirmation",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.email_domain.loss-first",
          route: "CB",
          subject: "actor",
          loss: "email_domain",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.email_domain.operation-first",
          route: "CB",
          subject: "actor",
          loss: "email_domain",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.email_equality.loss-first",
          route: "CB",
          subject: "actor",
          loss: "email_equality",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.email_equality.operation-first",
          route: "CB",
          subject: "actor",
          loss: "email_equality",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_verification.loss-first",
          route: "CB",
          subject: "actor",
          loss: "membership_verification",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_verification.operation-first",
          route: "CB",
          subject: "actor",
          loss: "membership_verification",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_delete.loss-first",
          route: "CB",
          subject: "actor",
          loss: "membership_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_delete.operation-first",
          route: "CB",
          subject: "actor",
          loss: "membership_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_campus.loss-first",
          route: "CB",
          subject: "actor",
          loss: "membership_campus",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_campus.operation-first",
          route: "CB",
          subject: "actor",
          loss: "membership_campus",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.campus_active.loss-first",
          route: "CB",
          subject: "actor",
          loss: "campus_active",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.campus_active.operation-first",
          route: "CB",
          subject: "actor",
          loss: "campus_active",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.campus_unc.loss-first",
          route: "CB",
          subject: "actor",
          loss: "campus_unc",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.campus_unc.operation-first",
          route: "CB",
          subject: "actor",
          loss: "campus_unc",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.campus_allowlist.loss-first",
          route: "CB",
          subject: "actor",
          loss: "campus_allowlist",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.campus_allowlist.operation-first",
          route: "CB",
          subject: "actor",
          loss: "campus_allowlist",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_missing.loss-first",
          route: "CB",
          subject: "actor",
          loss: "profile_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_missing.operation-first",
          route: "CB",
          subject: "actor",
          loss: "profile_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_required.loss-first",
          route: "CB",
          subject: "actor",
          loss: "profile_required",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_required.operation-first",
          route: "CB",
          subject: "actor",
          loss: "profile_required",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_primary.loss-first",
          route: "CB",
          subject: "actor",
          loss: "profile_primary",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_primary.operation-first",
          route: "CB",
          subject: "actor",
          loss: "profile_primary",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.object_detach_delete.loss-first",
          route: "CB",
          subject: "actor",
          loss: "object_detach_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.object_detach_delete.operation-first",
          route: "CB",
          subject: "actor",
          loss: "object_detach_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_delete_replace.loss-first",
          route: "CB",
          subject: "actor",
          loss: "membership_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.membership_delete_replace.operation-first",
          route: "CB",
          subject: "actor",
          loss: "membership_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_delete_replace.loss-first",
          route: "CB",
          subject: "actor",
          loss: "profile_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.actor.profile_delete_replace.operation-first",
          route: "CB",
          subject: "actor",
          loss: "profile_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.suspended.loss-first",
          route: "CB",
          subject: "peer",
          loss: "suspended",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.suspended.operation-first",
          route: "CB",
          subject: "peer",
          loss: "suspended",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.banned.loss-first",
          route: "CB",
          subject: "peer",
          loss: "banned",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.banned.operation-first",
          route: "CB",
          subject: "peer",
          loss: "banned",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.email_confirmation.loss-first",
          route: "CB",
          subject: "peer",
          loss: "email_confirmation",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.email_confirmation.operation-first",
          route: "CB",
          subject: "peer",
          loss: "email_confirmation",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.email_domain.loss-first",
          route: "CB",
          subject: "peer",
          loss: "email_domain",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.email_domain.operation-first",
          route: "CB",
          subject: "peer",
          loss: "email_domain",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.email_equality.loss-first",
          route: "CB",
          subject: "peer",
          loss: "email_equality",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.email_equality.operation-first",
          route: "CB",
          subject: "peer",
          loss: "email_equality",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_verification.loss-first",
          route: "CB",
          subject: "peer",
          loss: "membership_verification",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_verification.operation-first",
          route: "CB",
          subject: "peer",
          loss: "membership_verification",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_delete.loss-first",
          route: "CB",
          subject: "peer",
          loss: "membership_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_delete.operation-first",
          route: "CB",
          subject: "peer",
          loss: "membership_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_campus.loss-first",
          route: "CB",
          subject: "peer",
          loss: "membership_campus",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_campus.operation-first",
          route: "CB",
          subject: "peer",
          loss: "membership_campus",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.campus_active.loss-first",
          route: "CB",
          subject: "peer",
          loss: "campus_active",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.campus_active.operation-first",
          route: "CB",
          subject: "peer",
          loss: "campus_active",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.campus_unc.loss-first",
          route: "CB",
          subject: "peer",
          loss: "campus_unc",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.campus_unc.operation-first",
          route: "CB",
          subject: "peer",
          loss: "campus_unc",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.campus_allowlist.loss-first",
          route: "CB",
          subject: "peer",
          loss: "campus_allowlist",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.campus_allowlist.operation-first",
          route: "CB",
          subject: "peer",
          loss: "campus_allowlist",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_missing.loss-first",
          route: "CB",
          subject: "peer",
          loss: "profile_missing",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_missing.operation-first",
          route: "CB",
          subject: "peer",
          loss: "profile_missing",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_required.loss-first",
          route: "CB",
          subject: "peer",
          loss: "profile_required",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_required.operation-first",
          route: "CB",
          subject: "peer",
          loss: "profile_required",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_primary.loss-first",
          route: "CB",
          subject: "peer",
          loss: "profile_primary",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_primary.operation-first",
          route: "CB",
          subject: "peer",
          loss: "profile_primary",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.object_detach_delete.loss-first",
          route: "CB",
          subject: "peer",
          loss: "object_detach_delete",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.object_detach_delete.operation-first",
          route: "CB",
          subject: "peer",
          loss: "object_detach_delete",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_delete_replace.loss-first",
          route: "CB",
          subject: "peer",
          loss: "membership_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.membership_delete_replace.operation-first",
          route: "CB",
          subject: "peer",
          loss: "membership_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_delete_replace.loss-first",
          route: "CB",
          subject: "peer",
          loss: "profile_delete_replace",
          order: "loss-first",
          partition: "actual-observed-wait-required",
        },
        {
          id: "L3.CB.peer.profile_delete_replace.operation-first",
          route: "CB",
          subject: "peer",
          loss: "profile_delete_replace",
          order: "operation-first",
          partition: "actual-observed-wait-required",
        },
      ],
      phases: [
        "account",
        "Auth",
        "membership",
        "campus",
        "profile",
        "profile UPDATE; formerly referenced DELETE after detach",
      ],
      partitions: [
        "actual-observed-wait-required",
        "supplemental-failure-no-credit",
        "failed-no-success-credit",
        "cleanup-failed",
        "owned-exit-unproven",
      ],
    },
    "pilot-admission-current-safety-state-races.integration.mjs": {
      sha256:
        "94fc316708079c921a14e2a4178dbdae10d57d465f02a4f5ce7caf242bee5db6",
      hours: 12,
      cases: [
        {
          id: "L5.CH.source_disable.loss-first",
          route: "CH",
          loss: "source_disable",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CH.source_disable.operation-first",
          route: "CH",
          loss: "source_disable",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CH.source_cancel.loss-first",
          route: "CH",
          loss: "source_cancel",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CH.source_cancel.operation-first",
          route: "CH",
          loss: "source_cancel",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CH.actor_host_block_outbound.loss-first",
          route: "CH",
          loss: "actor_host_block_outbound",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CH.actor_host_block_outbound.operation-first",
          route: "CH",
          loss: "actor_host_block_outbound",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CH.actor_host_block_inbound.loss-first",
          route: "CH",
          loss: "actor_host_block_inbound",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CH.actor_host_block_inbound.operation-first",
          route: "CH",
          loss: "actor_host_block_inbound",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.peer_opt_out.loss-first",
          route: "CP",
          loss: "peer_opt_out",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.peer_opt_out.operation-first",
          route: "CP",
          loss: "peer_opt_out",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.peer_preference_delete.loss-first",
          route: "CP",
          loss: "peer_preference_delete",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.peer_preference_delete.operation-first",
          route: "CP",
          loss: "peer_preference_delete",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.actor_peer_block_outbound.loss-first",
          route: "CP",
          loss: "actor_peer_block_outbound",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.actor_peer_block_outbound.operation-first",
          route: "CP",
          loss: "actor_peer_block_outbound",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.actor_peer_block_inbound.loss-first",
          route: "CP",
          loss: "actor_peer_block_inbound",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CP.actor_peer_block_inbound.operation-first",
          route: "CP",
          loss: "actor_peer_block_inbound",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CB.peer_opt_out.loss-first",
          route: "CB",
          loss: "peer_opt_out",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CB.peer_opt_out.operation-first",
          route: "CB",
          loss: "peer_opt_out",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CB.peer_preference_delete.loss-first",
          route: "CB",
          loss: "peer_preference_delete",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CB.peer_preference_delete.operation-first",
          route: "CB",
          loss: "peer_preference_delete",
          order: "operation-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CB.actor_peer_block_outbound.loss-first",
          route: "CB",
          loss: "actor_peer_block_outbound",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CB.actor_peer_block_outbound.operation-first",
          route: "CB",
          loss: "actor_peer_block_outbound",
          order: "operation-first",
          partition: "actual-state-boundary-retained-idempotent-repair",
          outcome_classification:
            "Original actual current actor-to-peer block commits. Same actor-to-peer writer waits at social boundary then selects owned retained block and returns true as idempotent repair. Current-only fixture has no shared relationship/parent teardown: exact full54 zero writer delta, no additional block/new loss, zero committed-loss order credit.",
        },
        {
          id: "L5.CB.actor_peer_block_inbound.loss-first",
          route: "CB",
          loss: "actor_peer_block_inbound",
          order: "loss-first",
          partition: "actual-state-wait-required",
          outcome_classification:
            "CH cancel/disable terminal; CP/CB block loss-first can select retained if own outbound evidence now exists: enforce frozen-lane and separate retained controls, never label lawful retained success current denial",
        },
        {
          id: "L5.CB.actor_peer_block_inbound.operation-first",
          route: "CB",
          loss: "actor_peer_block_inbound",
          order: "operation-first",
          partition: "actual-state-boundary-expected-writer-denial",
          outcome_classification:
            "Original actual current actor-to-peer block commits. Peer-to-actor writer waits at social boundary, then has no peer-owned retained proof and fails exact 42501 Safety operation unavailable because bilateral People visibility is blocked. Full54 zero writer delta/rollback; zero committed-loss order credit. No manufactured retained proof or intervening unblock.",
        },
      ],
      phases: [
        "authorized-unblock-for-separate-current-denial",
        "holder-execution",
        "waiter-execution",
        "actual-lock-observation",
        "release-and-exact-outcome",
        "independent-case-setup",
        "absent-or-false-current-rollback-positive",
        "separate-companion-writer-preparation",
        "current-provenance-and-no-retained-recheck",
        "actual-state-race",
        "fresh-post-loss-lane-and-outcome",
        "guarded-case-reset",
      ],
      partitions: [
        "owned-exit-unproven",
        "actual-state-wait-required",
        "actual-state-boundary-retained-idempotent-repair",
        "actual-state-boundary-expected-writer-denial",
        "failed-abort-exact-rollback",
        "failed-abort-rollback-mismatch",
        "cleanup-failed",
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
      ],
    },
    "pilot-admission-current-safety-retained-races.integration.mjs": {
      sha256:
        "71910b93f13c70dfb555d2f99bff213f9470584674ab7d667a54b19304b7b09e",
      hours: 24,
      cases: [
        {
          id: "RF.CH.current_late_proof.availability",
          route: "CH",
          wait: "availability",
          family: "current_late_proof",
        },
        {
          id: "RF.CP.current_late_proof.availability",
          route: "CP",
          wait: "availability",
          family: "current_late_proof",
        },
        {
          id: "RF.CB.current_late_proof.availability",
          route: "CB",
          wait: "availability",
          family: "current_late_proof",
        },
        {
          id: "RF.CH.retained_proof_loss.safety_gate",
          route: "CH",
          wait: "safety_gate",
          family: "retained_proof_loss",
        },
        {
          id: "RF.CH.retained_proof_loss.actor_account",
          route: "CH",
          wait: "actor_account",
          family: "retained_proof_loss",
        },
        {
          id: "RF.CP.retained_proof_loss.safety_gate",
          route: "CP",
          wait: "safety_gate",
          family: "retained_proof_loss",
        },
        {
          id: "RF.CP.retained_proof_loss.actor_account",
          route: "CP",
          wait: "actor_account",
          family: "retained_proof_loss",
        },
        {
          id: "RF.CB.retained_proof_loss.safety_gate",
          route: "CB",
          wait: "safety_gate",
          family: "retained_proof_loss",
        },
        {
          id: "RF.CB.retained_proof_loss.actor_account",
          route: "CB",
          wait: "actor_account",
          family: "retained_proof_loss",
        },
        {
          id: "RF.CH.retained_unchanged.safety_gate",
          route: "CH",
          wait: "safety_gate",
          family: "retained_unchanged",
        },
        {
          id: "RF.CH.retained_unchanged.actor_account",
          route: "CH",
          wait: "actor_account",
          family: "retained_unchanged",
        },
        {
          id: "RF.CP.retained_unchanged.safety_gate",
          route: "CP",
          wait: "safety_gate",
          family: "retained_unchanged",
        },
        {
          id: "RF.CP.retained_unchanged.actor_account",
          route: "CP",
          wait: "actor_account",
          family: "retained_unchanged",
        },
        {
          id: "RF.CB.retained_unchanged.safety_gate",
          route: "CB",
          wait: "safety_gate",
          family: "retained_unchanged",
        },
        {
          id: "RF.CB.retained_unchanged.actor_account",
          route: "CB",
          wait: "actor_account",
          family: "retained_unchanged",
        },
        {
          id: "RF.CP.retained_reselect.safety_gate",
          route: "CP",
          wait: "safety_gate",
          family: "retained_reselect",
        },
        {
          id: "RF.CP.retained_reselect.actor_account",
          route: "CP",
          wait: "actor_account",
          family: "retained_reselect",
        },
        {
          id: "RF.CB.retained_reselect.safety_gate",
          route: "CB",
          wait: "safety_gate",
          family: "retained_reselect",
        },
        {
          id: "RF.CB.retained_reselect.actor_account",
          route: "CB",
          wait: "actor_account",
          family: "retained_reselect",
        },
        {
          id: "SI.CH.current.repeatable_read",
          route: "CH",
          family: "CH.current",
        },
        {
          id: "SI.CH.current.serializable",
          route: "CH",
          family: "CH.current",
        },
        {
          id: "SI.CP.current.repeatable_read",
          route: "CP",
          family: "CP.current",
        },
        {
          id: "SI.CP.current.serializable",
          route: "CP",
          family: "CP.current",
        },
        {
          id: "SI.CB.current.repeatable_read",
          route: "CB",
          family: "CB.current",
        },
        {
          id: "SI.CB.current.serializable",
          route: "CB",
          family: "CB.current",
        },
        {
          id: "SI.REPLAY.exact.repeatable_read",
          route: "CP",
          family: "REPLAY.exact",
        },
        {
          id: "SI.REPLAY.exact.serializable",
          route: "CP",
          family: "REPLAY.exact",
        },
        {
          id: "SI.RU.retained_user.repeatable_read",
          route: "CP",
          family: "RU.retained_user",
        },
        {
          id: "SI.RU.retained_user.serializable",
          route: "CP",
          family: "RU.retained_user",
        },
        {
          id: "SI.RH.retained_hangout.repeatable_read",
          route: "CH",
          family: "RH.retained_hangout",
        },
        {
          id: "SI.RH.retained_hangout.serializable",
          route: "CH",
          family: "RH.retained_hangout",
        },
        {
          id: "SI.RHOST.retained_host.repeatable_read",
          route: "CH",
          family: "RHOST.retained_host",
        },
        {
          id: "SI.RHOST.retained_host.serializable",
          route: "CH",
          family: "RHOST.retained_host",
        },
        {
          id: "SI.BLOCK.retained_true.repeatable_read",
          route: "CB",
          family: "BLOCK.retained_true",
        },
        {
          id: "SI.BLOCK.retained_true.serializable",
          route: "CB",
          family: "BLOCK.retained_true",
        },
        {
          id: "SI.UNBLOCK.outbound_false.repeatable_read",
          route: "CB",
          family: "UNBLOCK.outbound_false",
        },
        {
          id: "SI.UNBLOCK.outbound_false.serializable",
          route: "CB",
          family: "UNBLOCK.outbound_false",
        },
      ],
      phases: [
        "hold-actual-lower-row",
        "start-authenticated-public-waiter",
        "observe-required-lower-share-wait",
        "post-observation-holder-change",
        "original-public-outcome",
        "route-only-purpose-setup",
        "committed-retained-proof-setup",
        "read-committed-actual-public-rollback-positive",
        "actual-stronger-isolation-public-denial",
        "fresh-later-lane-proof",
        "fresh-later-actual-public-positive",
        "independent-case-setup",
        "guarded-case-reset",
      ],
      partitions: [
        "failed-uncredited",
        "serial-isolation-denial",
        "actual-lower-wait",
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
        "cleanup-failed",
        "owned-exit-unproven",
      ],
    },
    "pilot-admission-current-safety-crossings.integration.mjs": {
      sha256:
        "8eb617e82fddf9f402967b0b798f36417bf16e263bf01df28cc77cc8cb9afe41",
      hours: 36,
      cases: [
        {
          id: "X.CH.actor.owner_primary_assignment.writer-first",
          route: "CH",
          subject: "actor",
          order: "writer-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CH.actor.owner_primary_assignment.operation-first",
          route: "CH",
          subject: "actor",
          order: "operation-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CH.actor.owner_primary_detach_delete.writer-first",
          route: "CH",
          subject: "actor",
          order: "writer-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CH.actor.owner_primary_detach_delete.operation-first",
          route: "CH",
          subject: "actor",
          order: "operation-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CH.actor.auth_confirmation_null.writer-first",
          route: "CH",
          subject: "actor",
          order: "writer-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CH.actor.auth_confirmation_null.operation-first",
          route: "CH",
          subject: "actor",
          order: "operation-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CH.actor.auth_invalid_domain.writer-first",
          route: "CH",
          subject: "actor",
          order: "writer-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CH.actor.auth_invalid_domain.operation-first",
          route: "CH",
          subject: "actor",
          order: "operation-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CH.actor.referenced_primary_protection.serial",
          route: "CH",
          subject: "actor",
          order: "serial",
          writer: "referenced_primary_protection",
        },
        {
          id: "X.CH.actor.owner_onboarding_off.serial",
          route: "CH",
          subject: "actor",
          order: "serial",
          writer: "owner_onboarding_off",
        },
        {
          id: "X.CH.immutable_host.owner_primary_assignment.writer-first",
          route: "CH",
          subject: "immutable_host",
          order: "writer-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CH.immutable_host.owner_primary_assignment.operation-first",
          route: "CH",
          subject: "immutable_host",
          order: "operation-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CH.immutable_host.owner_primary_detach_delete.writer-first",
          route: "CH",
          subject: "immutable_host",
          order: "writer-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CH.immutable_host.owner_primary_detach_delete.operation-first",
          route: "CH",
          subject: "immutable_host",
          order: "operation-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CH.immutable_host.auth_confirmation_null.writer-first",
          route: "CH",
          subject: "immutable_host",
          order: "writer-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CH.immutable_host.auth_confirmation_null.operation-first",
          route: "CH",
          subject: "immutable_host",
          order: "operation-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CH.immutable_host.auth_invalid_domain.writer-first",
          route: "CH",
          subject: "immutable_host",
          order: "writer-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CH.immutable_host.auth_invalid_domain.operation-first",
          route: "CH",
          subject: "immutable_host",
          order: "operation-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CH.immutable_host.referenced_primary_protection.serial",
          route: "CH",
          subject: "immutable_host",
          order: "serial",
          writer: "referenced_primary_protection",
        },
        {
          id: "X.CH.immutable_host.owner_onboarding_off.serial",
          route: "CH",
          subject: "immutable_host",
          order: "serial",
          writer: "owner_onboarding_off",
        },
        {
          id: "X.CP.actor.owner_primary_assignment.writer-first",
          route: "CP",
          subject: "actor",
          order: "writer-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CP.actor.owner_primary_assignment.operation-first",
          route: "CP",
          subject: "actor",
          order: "operation-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CP.actor.owner_primary_detach_delete.writer-first",
          route: "CP",
          subject: "actor",
          order: "writer-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CP.actor.owner_primary_detach_delete.operation-first",
          route: "CP",
          subject: "actor",
          order: "operation-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CP.actor.auth_confirmation_null.writer-first",
          route: "CP",
          subject: "actor",
          order: "writer-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CP.actor.auth_confirmation_null.operation-first",
          route: "CP",
          subject: "actor",
          order: "operation-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CP.actor.auth_invalid_domain.writer-first",
          route: "CP",
          subject: "actor",
          order: "writer-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CP.actor.auth_invalid_domain.operation-first",
          route: "CP",
          subject: "actor",
          order: "operation-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CP.actor.referenced_primary_protection.serial",
          route: "CP",
          subject: "actor",
          order: "serial",
          writer: "referenced_primary_protection",
        },
        {
          id: "X.CP.actor.owner_onboarding_off.serial",
          route: "CP",
          subject: "actor",
          order: "serial",
          writer: "owner_onboarding_off",
        },
        {
          id: "X.CP.peer.owner_primary_assignment.writer-first",
          route: "CP",
          subject: "peer",
          order: "writer-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CP.peer.owner_primary_assignment.operation-first",
          route: "CP",
          subject: "peer",
          order: "operation-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CP.peer.owner_primary_detach_delete.writer-first",
          route: "CP",
          subject: "peer",
          order: "writer-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CP.peer.owner_primary_detach_delete.operation-first",
          route: "CP",
          subject: "peer",
          order: "operation-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CP.peer.auth_confirmation_null.writer-first",
          route: "CP",
          subject: "peer",
          order: "writer-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CP.peer.auth_confirmation_null.operation-first",
          route: "CP",
          subject: "peer",
          order: "operation-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CP.peer.auth_invalid_domain.writer-first",
          route: "CP",
          subject: "peer",
          order: "writer-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CP.peer.auth_invalid_domain.operation-first",
          route: "CP",
          subject: "peer",
          order: "operation-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CP.peer.referenced_primary_protection.serial",
          route: "CP",
          subject: "peer",
          order: "serial",
          writer: "referenced_primary_protection",
        },
        {
          id: "X.CP.peer.owner_onboarding_off.serial",
          route: "CP",
          subject: "peer",
          order: "serial",
          writer: "owner_onboarding_off",
        },
        {
          id: "X.CB.actor.owner_primary_assignment.writer-first",
          route: "CB",
          subject: "actor",
          order: "writer-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CB.actor.owner_primary_assignment.operation-first",
          route: "CB",
          subject: "actor",
          order: "operation-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CB.actor.owner_primary_detach_delete.writer-first",
          route: "CB",
          subject: "actor",
          order: "writer-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CB.actor.owner_primary_detach_delete.operation-first",
          route: "CB",
          subject: "actor",
          order: "operation-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CB.actor.auth_confirmation_null.writer-first",
          route: "CB",
          subject: "actor",
          order: "writer-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CB.actor.auth_confirmation_null.operation-first",
          route: "CB",
          subject: "actor",
          order: "operation-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CB.actor.auth_invalid_domain.writer-first",
          route: "CB",
          subject: "actor",
          order: "writer-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CB.actor.auth_invalid_domain.operation-first",
          route: "CB",
          subject: "actor",
          order: "operation-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CB.actor.referenced_primary_protection.serial",
          route: "CB",
          subject: "actor",
          order: "serial",
          writer: "referenced_primary_protection",
        },
        {
          id: "X.CB.actor.owner_onboarding_off.serial",
          route: "CB",
          subject: "actor",
          order: "serial",
          writer: "owner_onboarding_off",
        },
        {
          id: "X.CB.peer.owner_primary_assignment.writer-first",
          route: "CB",
          subject: "peer",
          order: "writer-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CB.peer.owner_primary_assignment.operation-first",
          route: "CB",
          subject: "peer",
          order: "operation-first",
          writer: "owner_primary_assignment",
        },
        {
          id: "X.CB.peer.owner_primary_detach_delete.writer-first",
          route: "CB",
          subject: "peer",
          order: "writer-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CB.peer.owner_primary_detach_delete.operation-first",
          route: "CB",
          subject: "peer",
          order: "operation-first",
          writer: "owner_primary_detach_delete",
        },
        {
          id: "X.CB.peer.auth_confirmation_null.writer-first",
          route: "CB",
          subject: "peer",
          order: "writer-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CB.peer.auth_confirmation_null.operation-first",
          route: "CB",
          subject: "peer",
          order: "operation-first",
          writer: "auth_confirmation_null",
        },
        {
          id: "X.CB.peer.auth_invalid_domain.writer-first",
          route: "CB",
          subject: "peer",
          order: "writer-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CB.peer.auth_invalid_domain.operation-first",
          route: "CB",
          subject: "peer",
          order: "operation-first",
          writer: "auth_invalid_domain",
        },
        {
          id: "X.CB.peer.referenced_primary_protection.serial",
          route: "CB",
          subject: "peer",
          order: "serial",
          writer: "referenced_primary_protection",
        },
        {
          id: "X.CB.peer.owner_onboarding_off.serial",
          route: "CB",
          subject: "peer",
          order: "serial",
          writer: "owner_onboarding_off",
        },
      ],
      phases: [
        "holder",
        "waiter",
        "wait",
        "release",
        "outcome",
        "setup",
        "precheck",
        "companion",
        "postcheck",
        "reset",
        "serial",
        "cleanup",
      ],
      partitions: [
        "failed-no-success-credit",
        "post-close-failure-settlement",
        "actual-observed-wait-order",
        "serial-RLS-zero-rows",
        "supplemental-failure-no-credit",
        "cleanup-failed",
        "owned-exit-unproven",
      ],
    },
    "pilot-admission-current-safety-retry-rate.integration.mjs": {
      sha256:
        "1d4973cdc5542d27e1b863d6804bfdfc5bc45b5e7e35448fffbf730d4cc22b12",
      hours: 12,
      cases: [
        {
          id: "L1R.CH.same_key_wait",
          route: "CH",
          kind: "same_key_wait",
        },
        {
          id: "L1R.CH.normalized_replay",
          route: "CH",
          kind: "normalized_replay",
        },
        {
          id: "L1R.CH.category_mismatch",
          route: "CH",
          kind: "category_mismatch",
        },
        {
          id: "L1R.CH.narrative_mismatch",
          route: "CH",
          kind: "narrative_mismatch",
        },
        {
          id: "L1R.CH.input_target_mismatch",
          route: "CH",
          kind: "input_target_mismatch",
        },
        {
          id: "L1R.CH.caller_request_isolation",
          route: "CH",
          kind: "caller_request_isolation",
        },
        {
          id: "L1R.CH.fifth_sixth_replay",
          route: "CH",
          kind: "fifth_sixth_replay",
        },
        {
          id: "L1R.CH.clock_after_account_wait",
          route: "CH",
          kind: "clock_after_account_wait",
        },
        {
          id: "L1R.CP.same_key_wait",
          route: "CP",
          kind: "same_key_wait",
        },
        {
          id: "L1R.CP.normalized_replay",
          route: "CP",
          kind: "normalized_replay",
        },
        {
          id: "L1R.CP.category_mismatch",
          route: "CP",
          kind: "category_mismatch",
        },
        {
          id: "L1R.CP.narrative_mismatch",
          route: "CP",
          kind: "narrative_mismatch",
        },
        {
          id: "L1R.CP.input_target_mismatch",
          route: "CP",
          kind: "input_target_mismatch",
        },
        {
          id: "L1R.CP.caller_request_isolation",
          route: "CP",
          kind: "caller_request_isolation",
        },
        {
          id: "L1R.CP.fifth_sixth_replay",
          route: "CP",
          kind: "fifth_sixth_replay",
        },
        {
          id: "L1R.CP.clock_after_account_wait",
          route: "CP",
          kind: "clock_after_account_wait",
        },
        {
          id: "L1R.retained.mode_distinction",
          route: "CH",
          kind: "mode_distinction",
        },
        {
          id: "L1R.retained.reference_distinction",
          route: "CH",
          kind: "reference_distinction",
        },
      ],
      phases: [
        "setup",
        "independent-case-setup",
        "actual-public-positive-rollback-guard",
        "guarded-case-reset",
        "same_key_wait",
        "normalized_replay",
        "category_mismatch",
        "narrative_mismatch",
        "input_target_mismatch",
        "caller_request_isolation",
        "fifth_sixth_replay",
        "clock_after_account_wait",
        "mode_distinction",
        "reference_distinction",
        "account-share-wait-before-expiry",
        "same-key-social-wait",
      ],
      partitions: [
        "failed-no-success-credit",
        "normal-zero-exit",
        "explicit-expected-denial",
        "owned-exit-unproven",
        "complete-actual-public-control",
        "cleanup-failed",
        "supplemental-failure-no-credit",
      ],
    },
    "pilot-admission-current-safety-rate-edge.integration.mjs": {
      sha256:
        "92a2dd31d90d7235dda96ef6f65a29cf37d046cbf0b67804cb271cde4179111b",
      hours: 2,
      cases: [
        {
          id: "L1E.CH.exact_lower_edge",
          route: "CH",
          older: false,
        },
        {
          id: "L1E.CH.one_microsecond_older",
          route: "CH",
          older: true,
        },
        {
          id: "L1E.CP.exact_lower_edge",
          route: "CP",
          older: false,
        },
        {
          id: "L1E.CP.one_microsecond_older",
          route: "CP",
          older: true,
        },
      ],
      phases: [
        "edge-setup",
        "edge-original-anchors",
        "edge-backend-binding",
        "edge-positive-guard",
        "edge-guard-rollback",
        "edge-instrumentation",
        "edge-seed",
        "edge-public-predicate",
        "edge-case-rollback",
        "edge-precleanup-failure",
        "edge-owner-close",
        "edge-backend-settlement",
        "edge-restoration",
        "edge-restoration-failure",
        "edge-refusal",
      ],
      partitions: [
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
        "cleanup-failed",
        "owned-exit-unproven",
      ],
    },
    "pilot-admission-current-safety-upgrade.integration.mjs": {
      sha256:
        "eb0013b951244e68ca8df7ac039272b16ef718da6ef56091ef21e627aae6a5cc",
      hours: 2,
      cases: [],
      phases: [
        "upgrade-refused",
        "prior-reset-complete",
        "prior-baseline-qualified",
        "only27-preservation-verified",
        "original-failure-before-cleanup",
        "cleanup-refused",
        "full27-clean",
        "cleanup-failed",
      ],
      partitions: [
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
        "cleanup-failed",
        "owned-exit-unproven",
      ],
    },
    "pilot-current-safety-operator-races.integration.mjs": {
      sha256:
        "87ba766a9eca3db000ef49a68419126ae9feb6060236b10c6737b4dfced2cf81",
      hours: 48,
      cases: [
        {
          id: "M.list_moderation_reports.gate_delete_replace.loss-first",
          loss: "gate_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.gate_delete_replace.operation-first",
          loss: "gate_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.role_delete_replace.loss-first",
          loss: "role_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.role_delete_replace.operation-first",
          loss: "role_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.account_banned.loss-first",
          loss: "account_banned",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.account_banned.operation-first",
          loss: "account_banned",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.role_nonoperator.loss-first",
          loss: "role_nonoperator",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.list_moderation_reports.role_nonoperator.operation-first",
          loss: "role_nonoperator",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "list_moderation_reports",
        },
        {
          id: "M.get_moderation_report.gate_delete_replace.loss-first",
          loss: "gate_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.gate_delete_replace.operation-first",
          loss: "gate_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.role_delete_replace.loss-first",
          loss: "role_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.role_delete_replace.operation-first",
          loss: "role_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.account_banned.loss-first",
          loss: "account_banned",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.account_banned.operation-first",
          loss: "account_banned",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.role_nonoperator.loss-first",
          loss: "role_nonoperator",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.get_moderation_report.role_nonoperator.operation-first",
          loss: "role_nonoperator",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "get_moderation_report",
        },
        {
          id: "M.transition_moderation_case.gate_delete_replace.loss-first",
          loss: "gate_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.gate_delete_replace.operation-first",
          loss: "gate_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.role_delete_replace.loss-first",
          loss: "role_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.role_delete_replace.operation-first",
          loss: "role_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.account_banned.loss-first",
          loss: "account_banned",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.account_banned.operation-first",
          loss: "account_banned",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.role_nonoperator.loss-first",
          loss: "role_nonoperator",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.transition_moderation_case.role_nonoperator.operation-first",
          loss: "role_nonoperator",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.apply_account_moderation_action.gate_delete_replace.loss-first",
          loss: "gate_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.gate_delete_replace.operation-first",
          loss: "gate_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.role_delete_replace.loss-first",
          loss: "role_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.role_delete_replace.operation-first",
          loss: "role_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.account_banned.loss-first",
          loss: "account_banned",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.account_banned.operation-first",
          loss: "account_banned",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.role_nonoperator.loss-first",
          loss: "role_nonoperator",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_account_moderation_action.role_nonoperator.operation-first",
          loss: "role_nonoperator",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.gate_delete_replace.loss-first",
          loss: "gate_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.gate_delete_replace.operation-first",
          loss: "gate_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.role_delete_replace.loss-first",
          loss: "role_delete_replace",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.role_delete_replace.operation-first",
          loss: "role_delete_replace",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.account_banned.loss-first",
          loss: "account_banned",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.account_banned.operation-first",
          loss: "account_banned",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.role_nonoperator.loss-first",
          loss: "role_nonoperator",
          order: "loss-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.apply_hangout_moderation_action.role_nonoperator.operation-first",
          loss: "role_nonoperator",
          order: "operation-first",
          partition: "actual-public-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.transition_moderation_case.gate_off.loss-first",
          loss: "gate_off",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.retry.transition_moderation_case.gate_off.operation-first",
          loss: "gate_off",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.retry.transition_moderation_case.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.retry.transition_moderation_case.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.retry.transition_moderation_case.role_missing.loss-first",
          loss: "role_missing",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.retry.transition_moderation_case.role_missing.operation-first",
          loss: "role_missing",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "transition_moderation_case",
        },
        {
          id: "M.retry.apply_account_moderation_action.gate_off.loss-first",
          loss: "gate_off",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_account_moderation_action.gate_off.operation-first",
          loss: "gate_off",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_account_moderation_action.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_account_moderation_action.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_account_moderation_action.role_missing.loss-first",
          loss: "role_missing",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_account_moderation_action.role_missing.operation-first",
          loss: "role_missing",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.gate_off.loss-first",
          loss: "gate_off",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.gate_off.operation-first",
          loss: "gate_off",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.account_suspended.loss-first",
          loss: "account_suspended",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.account_suspended.operation-first",
          loss: "account_suspended",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.role_missing.loss-first",
          loss: "role_missing",
          order: "loss-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.role_missing.operation-first",
          loss: "role_missing",
          order: "operation-first",
          partition: "actual-exact-retry-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.new.apply_account_moderation_action.admin_to_moderator.loss-first",
          loss: "admin_to_moderator",
          order: "loss-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.new.apply_account_moderation_action.admin_to_moderator.operation-first",
          loss: "admin_to_moderator",
          order: "operation-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_account_moderation_action.admin_to_moderator.loss-first",
          loss: "admin_to_moderator",
          order: "loss-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.retry.apply_account_moderation_action.admin_to_moderator.operation-first",
          loss: "admin_to_moderator",
          order: "operation-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_account_moderation_action",
        },
        {
          id: "M.new.apply_hangout_moderation_action.admin_to_moderator.loss-first",
          loss: "admin_to_moderator",
          order: "loss-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.new.apply_hangout_moderation_action.admin_to_moderator.operation-first",
          loss: "admin_to_moderator",
          order: "operation-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.admin_to_moderator.loss-first",
          loss: "admin_to_moderator",
          order: "loss-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_hangout_moderation_action",
        },
        {
          id: "M.retry.apply_hangout_moderation_action.admin_to_moderator.operation-first",
          loss: "admin_to_moderator",
          order: "operation-first",
          partition: "actual-authority-specific-wait",
          caller: "apply_hangout_moderation_action",
        },
      ],
      phases: [
        "eligible-public-precheck",
        "holder",
        "waiter",
        "required-tuple-wait",
        "release",
        "abort-rollback-partition",
        "later-public-control",
        "independent-authority-restoration",
        "independent-setup",
        "save-original-receipt",
        "saved-receipt-payload-conflict",
        "guarded-case-cleanup",
      ],
      partitions: [
        "actual-public-wait",
        "actual-exact-retry-wait",
        "actual-authority-specific-wait",
        "cleanup-failed",
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
        "owned-exit-unproven",
        "abort-rollback-no-credit",
        "failed-no-credit",
      ],
    },
  },
  columns: {
    "public.universities": [
      "active",
      "allowed_email_domains",
      "created_at",
      "id",
      "name",
      "slug",
    ],
    "public.accounts": ["created_at", "id", "status"],
    "public.university_memberships": [
      "created_at",
      "university_id",
      "user_id",
      "verification_email",
      "verified_at",
    ],
    "public.profiles": [
      "additional_photo_paths",
      "bio",
      "created_at",
      "down_to_do",
      "favorite_foods",
      "favorite_music",
      "graduation_year",
      "instagram",
      "interests",
      "is_complete",
      "major",
      "primary_photo_path",
      "prompts",
      "real_name",
      "revision",
      "user_id",
      "weird_fact",
    ],
    "public.platform_roles": ["created_at", "role", "user_id"],
    "public.hangouts": [
      "campus_zone",
      "created_at",
      "description",
      "ends_at",
      "host_id",
      "id",
      "joining_state",
      "location_precision",
      "public_latitude",
      "public_longitude",
      "public_place",
      "revision",
      "starts_at",
      "status",
      "title",
      "university_id",
      "updated_at",
      "visibility",
    ],
    "private.hangout_feature_gate": ["enabled", "singleton"],
    "private.hangout_create_requests": [
      "hangout_id",
      "host_id",
      "payload_fingerprint",
      "request_id",
    ],
    "public.hangout_participants": [
      "account_id",
      "hangout_id",
      "joined_at",
      "left_at",
      "removed_at",
      "state",
      "updated_at",
    ],
    "public.hangout_private_locations": [
      "hangout_id",
      "instructions",
      "updated_at",
    ],
    "private.people_feature_gate": ["enabled", "singleton"],
    "private.people_preferences": ["account_id", "opted_in"],
    "private.people_blocks": ["blocked_id", "blocker_id"],
    "private.friendship_feature_gate": ["enabled", "singleton"],
    "private.friendships": [
      "campus_id",
      "generation_id",
      "high_id",
      "low_id",
      "requester_id",
      "state",
    ],
    "private.friendship_create_requests": [
      "actor_id",
      "generation_id",
      "request_id",
      "target_id",
    ],
    "private.friendship_suppression": ["recipient_id", "requester_id"],
    "private.hangout_chat_feature_gate": ["enabled", "singleton"],
    "private.hangout_conversations": ["hangout_id", "id", "next_sequence"],
    "private.hangout_messages": [
      "author_id",
      "body",
      "conversation_id",
      "created_at",
      "id",
      "sequence",
    ],
    "private.hangout_message_requests": [
      "author_id",
      "hangout_id",
      "message_id",
      "payload_fingerprint",
      "request_id",
    ],
    "private.dm_feature_gate": ["enabled", "singleton"],
    "private.dm_pairs": [
      "campus_id",
      "created_at",
      "generation_id",
      "high_id",
      "initiator_id",
      "low_id",
      "next_sequence",
      "state",
    ],
    "private.dm_messages": [
      "author_id",
      "body",
      "created_at",
      "generation_id",
      "id",
      "sequence",
    ],
    "private.dm_retries": [
      "actor_id",
      "fingerprint",
      "generation_id",
      "kind",
      "message_id",
      "request_id",
      "target_id",
    ],
    "private.dm_suppression": ["initiator_id", "recipient_id"],
    "private.safety_reports": [
      "category",
      "id",
      "narrative",
      "provenance_kind",
      "provenance_ref_id",
      "reporter_id",
      "submitted_at",
      "target_id",
      "target_type",
    ],
    "private.safety_report_requests": [
      "input_fingerprint",
      "report_id",
      "reporter_id",
      "request_id",
    ],
    "private.moderation_feature_gate": ["enabled", "singleton"],
    "private.moderation_cases": [
      "disposition",
      "duplicate_report_id",
      "hangout_disable_id",
      "note",
      "report_id",
      "revision",
      "sanction_id",
      "state",
    ],
    "private.moderation_requests": [
      "fingerprint",
      "operator_id",
      "report_id",
      "request_id",
      "result_revision",
      "result_state",
    ],
    "private.moderation_audit": [
      "action",
      "duplicate_report_id",
      "hangout_disable_id",
      "id",
      "new_account_status",
      "new_hangout_disabled",
      "new_revision",
      "new_state",
      "occurred_at",
      "operator_id",
      "page_count",
      "page_report_ids",
      "previous_account_status",
      "previous_hangout_disabled",
      "previous_revision",
      "previous_state",
      "reason",
      "report_id",
      "request_id",
      "sanction_id",
      "subject_campus_id",
      "subject_target_id",
      "subject_target_type",
    ],
    "private.account_sanctions": [
      "action",
      "id",
      "new_status",
      "occurred_at",
      "operator_id",
      "previous_status",
      "reason",
      "report_id",
      "request_id",
      "subject_campus_id",
      "subject_id",
      "subject_type",
    ],
    "private.hangout_disables": [
      "hangout_id",
      "id",
      "new_disabled",
      "occurred_at",
      "operator_id",
      "previous_disabled",
      "reason",
      "report_id",
      "request_id",
      "subject_campus_id",
      "subject_type",
    ],
    "private.attendance_feature_gate": ["enabled", "singleton"],
    "private.attendance_answers": [
      "account_id",
      "answered_at",
      "attended",
      "hangout_id",
      "revision",
    ],
    "private.large_hangout_feature_gate": [
      "enabled",
      "ranking_epoch",
      "singleton",
    ],
    "private.large_hangout_signals": [
      "hangout_id",
      "observed_at",
      "policy_version",
      "threshold_value",
    ],
    "private.hangout_cohosts": ["account_id", "assigned_at", "hangout_id"],
    "private.pilot_account_admission": [
      "account_id",
      "created_at",
      "revision",
      "state",
      "updated_at",
    ],
    "private.pilot_admission_managers": [
      "account_id",
      "created_at",
      "revision",
      "state",
      "updated_at",
    ],
    "private.pilot_capabilities": [
      "created_at",
      "enabled",
      "key",
      "revision",
      "updated_at",
    ],
    "private.pilot_management_audit": [
      "actor_id",
      "id",
      "new_revision",
      "new_value",
      "occurred_at",
      "operation",
      "policy_key",
      "previous_revision",
      "previous_value",
      "reason",
      "request_id",
      "target_id",
    ],
    "private.pilot_management_requests": [
      "actor_id",
      "audit_id",
      "fingerprint",
      "request_id",
      "result_revision",
      "result_value",
    ],
    "private.pilot_manager_audit": [
      "account_id",
      "executor_backend_pid",
      "executor_original_role",
      "executor_session_user",
      "id",
      "new_revision",
      "new_state",
      "occurred_at",
      "previous_revision",
      "previous_state",
      "reason",
      "request_id",
    ],
    "auth.users": [
      "deleted_at",
      "email",
      "email_confirmed_at",
      "id",
      "raw_app_meta_data",
      "raw_user_meta_data",
    ],
    "storage.objects": [
      "bucket_id",
      "created_at",
      "id",
      "last_accessed_at",
      "name",
      "owner_id",
      "updated_at",
    ],
    "private.hangout_peer_provenance": ["hangout_id", "high_id", "low_id"],
    "private.notification_feature_gate": ["enabled", "singleton"],
    "private.notification_items": [
      "actor_id",
      "created_at",
      "event_code",
      "id",
      "read_at",
      "recipient_id",
      "source_id",
      "source_kind",
      "target_id",
    ],
    "private.notification_preferences": ["category", "enabled", "recipient_id"],
    "private.pilot_availability": [
      "created_at",
      "enabled",
      "revision",
      "singleton",
      "updated_at",
    ],
    "private.safety_feature_gate": ["enabled", "singleton"],
    "private.safety_reconciliation_effects": [
      "account_id",
      "effect",
      "hangout_id",
    ],
  },
  tables: [
    "private.account_sanctions",
    "private.attendance_answers",
    "private.attendance_feature_gate",
    "private.dm_feature_gate",
    "private.dm_messages",
    "private.dm_pairs",
    "private.dm_retries",
    "private.dm_suppression",
    "private.friendship_create_requests",
    "private.friendship_feature_gate",
    "private.friendship_suppression",
    "private.friendships",
    "private.hangout_chat_feature_gate",
    "private.hangout_cohosts",
    "private.hangout_conversations",
    "private.hangout_create_requests",
    "private.hangout_disables",
    "private.hangout_feature_gate",
    "private.hangout_message_requests",
    "private.hangout_messages",
    "private.hangout_peer_provenance",
    "private.large_hangout_feature_gate",
    "private.large_hangout_signals",
    "private.moderation_audit",
    "private.moderation_cases",
    "private.moderation_feature_gate",
    "private.moderation_requests",
    "private.notification_feature_gate",
    "private.notification_items",
    "private.notification_preferences",
    "private.people_blocks",
    "private.people_feature_gate",
    "private.people_preferences",
    "private.pilot_account_admission",
    "private.pilot_admission_managers",
    "private.pilot_availability",
    "private.pilot_capabilities",
    "private.pilot_management_audit",
    "private.pilot_management_requests",
    "private.pilot_manager_audit",
    "private.safety_feature_gate",
    "private.safety_reconciliation_effects",
    "private.safety_report_requests",
    "private.safety_reports",
    "public.accounts",
    "public.hangout_participants",
    "public.hangout_private_locations",
    "public.hangouts",
    "public.platform_roles",
    "public.profiles",
    "public.universities",
    "public.university_memberships",
    "storage.objects",
    "auth.users",
  ],
  matrix_sha256:
    "222e37c8cec635f6d2502a6de33a1edf469a54be0c80a48ae58d55e69c52ffe5",
});

const invalid = () => {
  throw new Error("Generic failure evidence unavailable");
};
const types = [
  "null",
  "undefined",
  "boolean",
  "number",
  "string",
  "array",
  "object",
  "bigint",
  "unknown",
];
const typeOf = (v) =>
  nativeTypes.isProxy(v)
    ? "unknown"
    : v === null
      ? "null"
      : Array.isArray(v)
        ? "array"
        : typeof v;
const sha = (v) => createHash("sha256").update(v).digest("hex");
const hashPattern = /^[a-f0-9]{64}$/;
// This walk never invokes accessors, toJSON or inherited serialization. Canonical
// own JSON data has sorted keys, no shared references and exact dense arrays.
function ownData(value) {
  let nodes = 0;
  const seen = new Set();
  function visit(v, depth) {
    if (
      ++nodes > genericFailureLimits.nodes ||
      depth > genericFailureLimits.depth
    )
      invalid();
    if (v === null || typeof v === "boolean") return v;
    if (typeof v === "number") {
      if (!Number.isSafeInteger(v) || v < 0 || Object.is(v, -0)) invalid();
      return v;
    }
    if (typeof v === "string") {
      if (Buffer.byteLength(v) > genericFailureLimits.frame) invalid();
      return v;
    }
    if (!v || typeof v !== "object" || nativeTypes.isProxy(v) || seen.has(v))
      invalid();
    const array = Array.isArray(v),
      proto = Object.getPrototypeOf(v);
    if (
      array
        ? proto !== Array.prototype
        : proto !== Object.prototype && proto !== null
    )
      invalid();
    seen.add(v);
    const keys = Reflect.ownKeys(v);
    if (keys.length > genericFailureLimits.nodes - nodes) invalid();
    const descriptors = Object.getOwnPropertyDescriptors(v);
    if (keys.some((k) => typeof k !== "string")) invalid();
    if (array) {
      if (keys.length !== v.length + 1 || !keys.includes("length")) invalid();
      const output = [];
      for (let i = 0; i < v.length; i++) {
        const d = descriptors[String(i)];
        if (!d || !Object.hasOwn(d, "value") || !d.enumerable) invalid();
        output.push(visit(d.value, depth + 1));
      }
      return output;
    }
    const output = Object.create(null);
    for (const k of keys.sort()) {
      const d = descriptors[k];
      if (!Object.hasOwn(d, "value") || !d.enumerable || k === "toJSON")
        invalid();
      output[k] = visit(d.value, depth + 1);
    }
    return output;
  }
  return visit(value, 0);
}
function fields(value, names) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("|") !== names.slice().sort().join("|")
  )
    invalid();
}
function one(value, values) {
  if (!values.includes(value)) invalid();
}
function count(value) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > genericFailureLimits.count
  )
    invalid();
}
function descriptor(v) {
  fields(v, ["type", "available", "sha256", "precision"]);
  one(v.type, types);
  if (v.available === true) {
    if (
      !hashPattern.test(v.sha256) ||
      v.type === "unknown" ||
      v.precision !== "original-value"
    )
      invalid();
  } else if (v.available === false) {
    if (v.sha256 !== null) invalid();
    one(v.precision, ["unavailable", "inherited-withheld"]);
  } else invalid();
}
export function unavailableFailureValue(type = "unknown", inherited = false) {
  one(type, types);
  if (typeof inherited !== "boolean") invalid();
  return freeze({
    type,
    available: false,
    sha256: null,
    precision: inherited ? "inherited-withheld" : "unavailable",
  });
}
// Hash only original typed own data. The separately normalized record interface
// never accepts an arbitrary local projection. Withheld upstream values must be
// represented with unavailableFailureValue(..., true), never rehashed.
export function originalFailureValue(value) {
  const type = typeOf(value);
  if (
    !types.includes(type) ||
    (typeof value === "string" && /<redacted(?:-token)?>|<absent>/.test(value))
  )
    return unavailableFailureValue(
      types.includes(type) ? type : "unknown",
      true,
    );
  let nodes = 0,
    inherited = false;
  const seen = new Set();
  function encode(v, depth = 0) {
    if (
      ++nodes > genericFailureLimits.nodes ||
      depth > genericFailureLimits.depth
    )
      invalid();
    const t = typeOf(v);
    if (t === "undefined" || t === "null") return [t];
    if (t === "bigint") return [t, String(v)];
    if (t === "number") {
      if (!Number.isFinite(v)) invalid();
      return [t, Object.is(v, -0) ? "-0" : String(v)];
    }
    if (t === "boolean" || t === "string") {
      if (
        t === "string" &&
        (Buffer.byteLength(v) > genericFailureLimits.frame ||
          /<redacted(?:-token)?>|<absent>/.test(v))
      )
        invalid();
      return [t, v];
    }
    if (
      !["object", "array"].includes(t) ||
      nativeTypes.isProxy(v) ||
      seen.has(v)
    )
      invalid();
    const p = Object.getPrototypeOf(v);
    if (
      t === "array"
        ? p !== Array.prototype
        : p !== Object.prototype && p !== null
    )
      invalid();
    seen.add(v);
    const keys = Reflect.ownKeys(v);
    if (keys.length > genericFailureLimits.nodes - nodes) invalid();
    const ds = Object.getOwnPropertyDescriptors(v);
    if (keys.some((k) => typeof k !== "string")) invalid();
    // Conservatively recognize upstream projection/withholding shapes without
    // touching their accessors. Never hash a digest or unavailable placeholder
    // as though it were the original private value.
    if (
      Object.hasOwn(ds.available ?? {}, "value") &&
      typeof ds.available.value === "boolean" &&
      (ds.available.value === false ||
        (Object.hasOwn(ds.type ?? {}, "value") &&
          types.includes(ds.type.value)) ||
        Object.hasOwn(ds.sha256 ?? {}, "value"))
    ) {
      inherited = true;
      invalid();
    }
    if (t === "array") {
      if (keys.length !== v.length + 1) invalid();
      return [
        t,
        Array.from({ length: v.length }, (_, i) => {
          const d = ds[String(i)];
          if (!d || !Object.hasOwn(d, "value") || !d.enumerable) invalid();
          return encode(d.value, depth + 1);
        }),
      ];
    }
    return [
      t,
      keys.sort().map((k) => {
        const d = ds[k];
        if (!Object.hasOwn(d, "value") || !d.enumerable || k === "toJSON")
          invalid();
        return [k, encode(d.value, depth + 1)];
      }),
    ];
  }
  try {
    const encoded = JSON.stringify(encode(value));
    if (Buffer.byteLength(encoded) > genericFailureLimits.frame) invalid();
    return freeze({
      type,
      available: true,
      sha256: sha(encoded),
      precision: "original-value",
    });
  } catch {
    return unavailableFailureValue(type, inherited);
  }
}
const pairs = freeze([
  ...[
    "Safety report unavailable",
    "Safety operation unavailable",
    "Hangout operation not permitted",
    "Hangout chat unavailable",
    "Moderation unavailable",
    "Pilot management unavailable",
    "Owner operation unavailable",
  ].map((message) => ["42501", message]),
  ["23514", "Detach a profile photo before deleting it"],
  ["23514", "Photos must be existing owned private objects"],
  ["40P01", "deadlock detected"],
  ["40001", "could not serialize access due to concurrent update"],
  [
    "40001",
    "could not serialize access due to read/write dependencies among transactions",
  ],
  ["57014", "canceling statement due to statement timeout"],
  ["55P03", "canceling statement due to lock timeout"],
]);
const stateWaits = freeze([
  "social (16016,1) exclusive before moderation/pilot/lane selection; no lower current tuple credit",
  "social (16016,1) exclusive before shared pilot/lifecycle and current lane selection; no lower tuple credit",
  "public opt-out account UPDATE waits on current peer account SHARE, before preference UPSERT",
  "current peer account SHARE waits on public opt-out account UPDATE, before required preference lookup",
  "required peer preference SHARE versus actual preference DELETE tuple/transaction wait; privileged synthetic maintenance only",
  "social (16016,1) exclusive before shared pilot/current-or-retained lane selection; no lower tuple/no-upgrade/no-fallback credit",
]);
function moduleManifest(name) {
  if (
    typeof name !== "string" ||
    !Object.hasOwn(failureWireManifest.modules, name)
  )
    invalid();
  return failureWireManifest.modules[name];
}
export function futureFailureInterruptionCeiling(name) {
  if (name === "pilot-admission-current-safety-http.integration.mjs")
    return 24 * 3600000;
  return moduleManifest(name).hours * 3600000;
}
function context(record, manifest, name) {
  fields(record, [
    "case_id",
    "phase",
    "partition",
    "order",
    "writer",
    "wait",
    "resource",
    "classification",
    "suite",
    "qualification",
  ]);
  const cell =
    record.case_id === null
      ? null
      : manifest.cases.find((c) => c.id === record.case_id);
  if (record.case_id !== null && !cell) invalid();
  if (record.phase !== null) one(record.phase, manifest.phases);
  if (record.partition !== null) one(record.partition, manifest.partitions);
  // Suite/support context carries no invented case, order, writer or resource.
  if (!cell) {
    for (const key of ["order", "writer", "wait", "resource", "classification"])
      if (record[key] !== null) invalid();
  } else {
    if (record.order !== null && record.order !== (cell.order ?? null))
      invalid();
    if (
      record.partition !== null &&
      ![
        "failed-no-success-credit",
        "supplemental-failure-no-credit",
        "cleanup-failed",
        "owned-exit-unproven",
        "failed-abort-exact-rollback",
        "failed-abort-rollback-mismatch",
        "failed-uncredited",
        "post-close-failure-settlement",
      ].includes(record.partition) &&
      !(
        name === "pilot-current-safety-operator-races.integration.mjs" &&
        ["abort-rollback-no-credit", "failed-no-credit"].includes(
          record.partition,
        )
      ) &&
      record.partition !== (cell.partition ?? null)
    )
      invalid();
    let writer = cell.writer ?? null,
      wait = cell.wait ?? null,
      resource = null,
      classification = cell.outcome_classification ?? null;
    if (name.includes("identity-races")) {
      resource =
        cell.loss === "object_detach_delete"
          ? "profile UPDATE; formerly referenced DELETE after detach"
          : cell.loss.startsWith("campus_")
            ? "campus"
            : cell.loss.startsWith("email_") && cell.loss !== "email_equality"
              ? "Auth"
              : cell.loss.startsWith("membership_") ||
                  cell.loss === "email_equality"
                ? "membership"
                : cell.loss.startsWith("profile_")
                  ? "profile"
                  : "account";
      writer =
        "privileged synthetic identity preparation; not permission evidence";
      if (record.phase !== null && record.phase !== resource) invalid();
      if (record.classification !== null)
        one(record.classification, [
          "whole-race-rollback",
          "known-lawful-committed-survivor",
          "unexplained-delta",
          "observation-unavailable",
          "settlement-unavailable",
        ]);
      classification = record.classification;
    }
    if (name.includes("state-races")) {
      classification =
        cell.id === "L5.CB.actor_peer_block_inbound.operation-first"
          ? "public-writer-denial-no-committed-loss-order"
          : cell.id === "L5.CB.actor_peer_block_outbound.operation-first"
            ? "retained-repair-no-new-loss"
            : "planned-committed-state-loss";
      writer =
        {
          source_disable: "disable",
          source_cancel: "cancel",
          peer_opt_out: "optout",
          peer_preference_delete: "delete",
        }[cell.loss] ?? "block";
      wait =
        stateWaits[
          cell.loss === "source_disable"
            ? 0
            : cell.loss === "source_cancel"
              ? 1
              : cell.loss === "peer_opt_out"
                ? cell.order === "operation-first"
                  ? 2
                  : 3
                : cell.loss === "peer_preference_delete"
                  ? 4
                  : 5
        ];
      resource =
        cell.loss === "peer_opt_out"
          ? "public.accounts"
          : cell.loss === "peer_preference_delete"
            ? "private.people_preferences"
            : null;
      // Precise wait depends on the full independently canonical case/order/kind.
      if (
        record.wait !== null &&
        (record.order !== cell.order || record.writer !== writer)
      )
        invalid();
    }
    for (const [key, value] of [
      ["writer", writer],
      ["wait", wait],
      ["resource", resource],
      ["classification", classification],
    ])
      if (record[key] !== null && record[key] !== value) invalid();
    if (
      name.includes("identity-races") &&
      (record.resource !== null || record.writer !== null) &&
      (record.order !== cell.order ||
        record.phase !== resource ||
        record.writer !== writer)
    )
      invalid();
  }
  const edge = name.includes("rate-edge"),
    identity = name.includes("identity-races");
  if (
    record.suite !== null &&
    record.suite !==
      (edge ? "B3c-instrumented-rate-edge" : identity ? "identity-suite" : null)
  )
    invalid();
  if (
    record.qualification !== null &&
    record.qualification !==
      (edge ? "instrumented-actual-public-predicate-only" : null)
  )
    invalid();
  if (
    edge &&
    (record.suite !== "B3c-instrumented-rate-edge" ||
      record.qualification !== "instrumented-actual-public-predicate-only")
  )
    invalid();
}
function summary(v) {
  fields(v, ["available", "tables"]);
  if (v.available === false) {
    if (v.tables !== null) invalid();
    return;
  }
  if (
    v.available !== true ||
    !Array.isArray(v.tables) ||
    v.tables.length !== failureWireManifest.tables.length
  )
    invalid();
  v.tables.forEach((entry, i) => {
    fields(entry, ["table", "count", "value"]);
    if (entry.table !== failureWireManifest.tables[i]) invalid();
    count(entry.count);
    descriptor(entry.value);
  });
}
export function normalizeFailureEnvelope(input, selectedModule) {
  const manifest = moduleManifest(selectedModule),
    v = ownData(input);
  fields(v, [
    "version",
    "module",
    "sequence",
    "original_sequence",
    "receipt",
    "context",
    "diagnostic",
    "summaries",
    "differences",
    "flags",
    "credits",
  ]);
  if (v.version !== 1 || v.module !== selectedModule) invalid();
  count(v.sequence);
  if (v.sequence >= genericFailureLimits.records || v.original_sequence !== 0)
    invalid();
  one(v.receipt, [
    "original-before-cleanup",
    "supplemental-observation",
    "supplemental-rollback",
    "supplemental-closure",
    "supplemental-reset",
    "supplemental-restoration",
  ]);
  if ((v.sequence === 0) !== (v.receipt === "original-before-cleanup"))
    invalid();
  context(v.context, manifest, selectedModule);
  fields(v.diagnostic, ["code", "message", "detail"]);
  if (v.diagnostic.code === null || v.diagnostic.message === null) {
    if (v.diagnostic.code !== null || v.diagnostic.message !== null) invalid();
    descriptor(v.diagnostic.detail);
  } else {
    if (
      !pairs.some(
        ([c, m]) => v.diagnostic.code === c && v.diagnostic.message === m,
      ) ||
      v.diagnostic.detail !== null
    )
      invalid();
  }
  fields(v.summaries, ["before", "after", "expected", "holder"]);
  Object.values(v.summaries).forEach(summary);
  if (
    !Array.isArray(v.differences) ||
    v.differences.length > genericFailureLimits.differences
  )
    invalid();
  for (const d of v.differences) {
    fields(d, [
      "scope",
      "table",
      "row",
      "column",
      "kind",
      "expected",
      "observed",
    ]);
    one(d.scope, ["domain", "result", "catalog", "opaque"]);
    if (d.scope === "domain") {
      if (!Object.hasOwn(failureWireManifest.columns, d.table)) invalid();
      if (d.column !== null)
        one(d.column, failureWireManifest.columns[d.table]);
      if (d.row !== null) count(d.row);
    } else if (d.table !== null || d.row !== null || d.column !== null)
      invalid();
    one(d.kind, [
      "missing",
      "unexpected",
      "type",
      "value",
      "count",
      "unavailable",
    ]);
    descriptor(d.expected);
    descriptor(d.observed);
  }
  fields(v.flags, ["cleanup", "reset", "target", "settlement"]);
  if (v.flags.cleanup !== "unverified" || v.flags.reset !== "forbidden")
    invalid();
  one(v.flags.target, ["unestablished", "established"]);
  one(v.flags.settlement, ["unproven", "observed"]);
  fields(v.credits, ["order", "suite", "allocation", "cleanup", "pass"]);
  if (
    v.credits.order !== 0 ||
    v.credits.suite !== 0 ||
    v.credits.allocation !== 0 ||
    v.credits.cleanup !== false ||
    v.credits.pass !== false
  )
    invalid();
  return freeze(v);
}
export function encodeFailureFrame(input, selectedModule) {
  const record = normalizeFailureEnvelope(input, selectedModule);
  const payload = Buffer.from(JSON.stringify(record));
  if (payload.length > genericFailureLimits.frame) invalid();
  decodeFailurePayload(payload, selectedModule);
  const frame = Buffer.alloc(payload.length + 4);
  frame.writeUInt32BE(payload.length);
  payload.copy(frame, 4);
  return frame;
}
export function decodeFailurePayload(payload, selectedModule) {
  try {
    if (
      !Buffer.isBuffer(payload) ||
      !payload.length ||
      payload.length > genericFailureLimits.frame
    )
      invalid();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(payload);
    const record = normalizeFailureEnvelope(JSON.parse(text), selectedModule);
    if (!Buffer.from(JSON.stringify(record)).equals(payload)) invalid();
    return record;
  } catch {
    invalid();
  }
}
export function createFailureWireReceiver(selectedModule) {
  moduleManifest(selectedModule);
  let pending = Buffer.alloc(0),
    total = 0,
    ended = false,
    closed = false,
    reason = null,
    code = null,
    signal = null;
  const records = [];
  const invalidate = (why) => {
    reason ??= why;
    pending = Buffer.alloc(0);
    records.length = 0;
  };
  return Object.freeze({
    receive(chunk) {
      if (reason) return;
      if (ended || !Buffer.isBuffer(chunk)) {
        invalidate("invalid-channel");
        return;
      }
      total += chunk.length;
      if (total > genericFailureLimits.total) {
        invalidate("overflow");
        return;
      }
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= 4) {
        const size = pending.readUInt32BE(0);
        if (!size) {
          invalidate("writer-unavailable");
          return;
        }
        if (
          size > genericFailureLimits.frame ||
          records.length >= genericFailureLimits.records
        ) {
          invalidate("overflow");
          return;
        }
        if (pending.length < size + 4) return;
        try {
          const record = decodeFailurePayload(
            pending.subarray(4, size + 4),
            selectedModule,
          );
          if (record.sequence !== records.length) invalid();
          records.push(record);
        } catch {
          invalidate("invalid-record");
          return;
        }
        pending = pending.subarray(size + 4);
      }
    },
    end() {
      if (ended) {
        invalidate("duplicate-eof");
        return;
      }
      ended = true;
      if (pending.length) invalidate("truncated");
    },
    error() {
      invalidate("channel-error");
    },
    close(exitCode, exitSignal) {
      if (closed) {
        invalidate("duplicate-close");
        return;
      }
      closed = true;
      code = exitCode;
      signal = exitSignal;
      if (code === genericWireUnavailableExit)
        invalidate("writer-unavailable-exit");
      if (
        !Number.isSafeInteger(code) ||
        code < 0 ||
        code > 255 ||
        signal !== null
      )
        invalidate("unknown-or-signaled-close");
    },
    interrupt() {
      invalidate("interrupted");
    },
    evidence() {
      const unavailable =
        reason ??
        (!ended
          ? "eof-unobserved"
          : !closed
            ? "close-unobserved"
            : !records.length
              ? "absent"
              : null);
      return freeze({
        availability: unavailable ? "unavailable" : "available",
        reason: unavailable,
        records: unavailable ? [] : records.slice(),
        module_failed: true,
        module_credit: 0,
        cleanup_verified: false,
        reset_allowed: false,
        exit_code:
          closed && Number.isSafeInteger(code) && code >= 0 ? code : null,
        exit_signal: signal === null ? null : "withheld",
      });
    },
  });
}

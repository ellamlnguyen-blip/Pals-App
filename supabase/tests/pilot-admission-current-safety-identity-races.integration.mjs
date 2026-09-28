import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  localTarget,
  sql,
  quote,
  session,
  until,
  resetDisposable,
  assertClean,
} from "./helpers/pilot-admission-current-safety.mjs";
import {
  census,
  censusQuery,
  censusTables,
  routes,
  prepare,
  caseIds,
  identityLoss,
  auth,
  denialFor,
  assertCurrentOnly,
  campus,
  email,
  photoPath,
  assertReportOutcome,
  assertStoredProvenance,
} from "./helpers/pilot-current-safety-fixtures.mjs";

// Literal, source-matrix allocation. Importing this module performs no target IO.
export const identityPlans = Object.freeze(
  [
    {
      id: "L3.CH.actor.suspended.loss-first",
      route: "CH",
      subject: "actor",
      loss: "suspended",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.suspended.operation-first",
      route: "CH",
      subject: "actor",
      loss: "suspended",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.banned.loss-first",
      route: "CH",
      subject: "actor",
      loss: "banned",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.banned.operation-first",
      route: "CH",
      subject: "actor",
      loss: "banned",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.email_confirmation.loss-first",
      route: "CH",
      subject: "actor",
      loss: "email_confirmation",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.email_confirmation.operation-first",
      route: "CH",
      subject: "actor",
      loss: "email_confirmation",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.email_domain.loss-first",
      route: "CH",
      subject: "actor",
      loss: "email_domain",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.email_domain.operation-first",
      route: "CH",
      subject: "actor",
      loss: "email_domain",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.email_equality.loss-first",
      route: "CH",
      subject: "actor",
      loss: "email_equality",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.email_equality.operation-first",
      route: "CH",
      subject: "actor",
      loss: "email_equality",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.membership_verification.loss-first",
      route: "CH",
      subject: "actor",
      loss: "membership_verification",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.membership_verification.operation-first",
      route: "CH",
      subject: "actor",
      loss: "membership_verification",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.membership_delete.loss-first",
      route: "CH",
      subject: "actor",
      loss: "membership_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.membership_delete.operation-first",
      route: "CH",
      subject: "actor",
      loss: "membership_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.membership_campus.loss-first",
      route: "CH",
      subject: "actor",
      loss: "membership_campus",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.membership_campus.operation-first",
      route: "CH",
      subject: "actor",
      loss: "membership_campus",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.campus_active.loss-first",
      route: "CH",
      subject: "actor",
      loss: "campus_active",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.campus_active.operation-first",
      route: "CH",
      subject: "actor",
      loss: "campus_active",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.campus_unc.loss-first",
      route: "CH",
      subject: "actor",
      loss: "campus_unc",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.campus_unc.operation-first",
      route: "CH",
      subject: "actor",
      loss: "campus_unc",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.campus_allowlist.loss-first",
      route: "CH",
      subject: "actor",
      loss: "campus_allowlist",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.campus_allowlist.operation-first",
      route: "CH",
      subject: "actor",
      loss: "campus_allowlist",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_missing.loss-first",
      route: "CH",
      subject: "actor",
      loss: "profile_missing",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_missing.operation-first",
      route: "CH",
      subject: "actor",
      loss: "profile_missing",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_required.loss-first",
      route: "CH",
      subject: "actor",
      loss: "profile_required",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_required.operation-first",
      route: "CH",
      subject: "actor",
      loss: "profile_required",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_primary.loss-first",
      route: "CH",
      subject: "actor",
      loss: "profile_primary",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_primary.operation-first",
      route: "CH",
      subject: "actor",
      loss: "profile_primary",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.object_detach_delete.loss-first",
      route: "CH",
      subject: "actor",
      loss: "object_detach_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CH.actor.object_detach_delete.operation-first",
      route: "CH",
      subject: "actor",
      loss: "object_detach_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CH.actor.membership_delete_replace.loss-first",
      route: "CH",
      subject: "actor",
      loss: "membership_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.membership_delete_replace.operation-first",
      route: "CH",
      subject: "actor",
      loss: "membership_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_delete_replace.loss-first",
      route: "CH",
      subject: "actor",
      loss: "profile_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.actor.profile_delete_replace.operation-first",
      route: "CH",
      subject: "actor",
      loss: "profile_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.suspended.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "suspended",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.suspended.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "suspended",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.banned.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "banned",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.banned.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "banned",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.email_confirmation.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "email_confirmation",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.email_confirmation.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "email_confirmation",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.email_domain.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "email_domain",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.email_domain.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "email_domain",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.email_equality.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "email_equality",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.email_equality.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "email_equality",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.membership_verification.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_verification",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.membership_verification.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_verification",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.membership_delete.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.membership_delete.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.membership_campus.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_campus",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.membership_campus.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_campus",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.campus_active.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "campus_active",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.campus_active.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "campus_active",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.campus_unc.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "campus_unc",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.campus_unc.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "campus_unc",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.campus_allowlist.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "campus_allowlist",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.campus_allowlist.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "campus_allowlist",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_missing.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_missing",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_missing.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_missing",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_required.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_required",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_required.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_required",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_primary.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_primary",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_primary.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_primary",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.object_detach_delete.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "object_detach_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CH.immutable_host.object_detach_delete.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "object_detach_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CH.immutable_host.membership_delete_replace.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.membership_delete_replace.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "membership_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_delete_replace.loss-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CH.immutable_host.profile_delete_replace.operation-first",
      route: "CH",
      subject: "immutable_host",
      loss: "profile_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.suspended.loss-first",
      route: "CP",
      subject: "actor",
      loss: "suspended",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.suspended.operation-first",
      route: "CP",
      subject: "actor",
      loss: "suspended",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.banned.loss-first",
      route: "CP",
      subject: "actor",
      loss: "banned",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.banned.operation-first",
      route: "CP",
      subject: "actor",
      loss: "banned",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.email_confirmation.loss-first",
      route: "CP",
      subject: "actor",
      loss: "email_confirmation",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.email_confirmation.operation-first",
      route: "CP",
      subject: "actor",
      loss: "email_confirmation",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.email_domain.loss-first",
      route: "CP",
      subject: "actor",
      loss: "email_domain",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.email_domain.operation-first",
      route: "CP",
      subject: "actor",
      loss: "email_domain",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.email_equality.loss-first",
      route: "CP",
      subject: "actor",
      loss: "email_equality",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.email_equality.operation-first",
      route: "CP",
      subject: "actor",
      loss: "email_equality",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.membership_verification.loss-first",
      route: "CP",
      subject: "actor",
      loss: "membership_verification",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.membership_verification.operation-first",
      route: "CP",
      subject: "actor",
      loss: "membership_verification",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.membership_delete.loss-first",
      route: "CP",
      subject: "actor",
      loss: "membership_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.membership_delete.operation-first",
      route: "CP",
      subject: "actor",
      loss: "membership_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.membership_campus.loss-first",
      route: "CP",
      subject: "actor",
      loss: "membership_campus",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.membership_campus.operation-first",
      route: "CP",
      subject: "actor",
      loss: "membership_campus",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.campus_active.loss-first",
      route: "CP",
      subject: "actor",
      loss: "campus_active",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.campus_active.operation-first",
      route: "CP",
      subject: "actor",
      loss: "campus_active",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.campus_unc.loss-first",
      route: "CP",
      subject: "actor",
      loss: "campus_unc",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.campus_unc.operation-first",
      route: "CP",
      subject: "actor",
      loss: "campus_unc",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.campus_allowlist.loss-first",
      route: "CP",
      subject: "actor",
      loss: "campus_allowlist",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.campus_allowlist.operation-first",
      route: "CP",
      subject: "actor",
      loss: "campus_allowlist",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_missing.loss-first",
      route: "CP",
      subject: "actor",
      loss: "profile_missing",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_missing.operation-first",
      route: "CP",
      subject: "actor",
      loss: "profile_missing",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_required.loss-first",
      route: "CP",
      subject: "actor",
      loss: "profile_required",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_required.operation-first",
      route: "CP",
      subject: "actor",
      loss: "profile_required",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_primary.loss-first",
      route: "CP",
      subject: "actor",
      loss: "profile_primary",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_primary.operation-first",
      route: "CP",
      subject: "actor",
      loss: "profile_primary",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.object_detach_delete.loss-first",
      route: "CP",
      subject: "actor",
      loss: "object_detach_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CP.actor.object_detach_delete.operation-first",
      route: "CP",
      subject: "actor",
      loss: "object_detach_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CP.actor.membership_delete_replace.loss-first",
      route: "CP",
      subject: "actor",
      loss: "membership_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.membership_delete_replace.operation-first",
      route: "CP",
      subject: "actor",
      loss: "membership_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_delete_replace.loss-first",
      route: "CP",
      subject: "actor",
      loss: "profile_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.actor.profile_delete_replace.operation-first",
      route: "CP",
      subject: "actor",
      loss: "profile_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.suspended.loss-first",
      route: "CP",
      subject: "peer",
      loss: "suspended",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.suspended.operation-first",
      route: "CP",
      subject: "peer",
      loss: "suspended",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.banned.loss-first",
      route: "CP",
      subject: "peer",
      loss: "banned",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.banned.operation-first",
      route: "CP",
      subject: "peer",
      loss: "banned",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.email_confirmation.loss-first",
      route: "CP",
      subject: "peer",
      loss: "email_confirmation",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.email_confirmation.operation-first",
      route: "CP",
      subject: "peer",
      loss: "email_confirmation",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.email_domain.loss-first",
      route: "CP",
      subject: "peer",
      loss: "email_domain",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.email_domain.operation-first",
      route: "CP",
      subject: "peer",
      loss: "email_domain",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.email_equality.loss-first",
      route: "CP",
      subject: "peer",
      loss: "email_equality",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.email_equality.operation-first",
      route: "CP",
      subject: "peer",
      loss: "email_equality",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.membership_verification.loss-first",
      route: "CP",
      subject: "peer",
      loss: "membership_verification",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.membership_verification.operation-first",
      route: "CP",
      subject: "peer",
      loss: "membership_verification",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.membership_delete.loss-first",
      route: "CP",
      subject: "peer",
      loss: "membership_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.membership_delete.operation-first",
      route: "CP",
      subject: "peer",
      loss: "membership_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.membership_campus.loss-first",
      route: "CP",
      subject: "peer",
      loss: "membership_campus",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.membership_campus.operation-first",
      route: "CP",
      subject: "peer",
      loss: "membership_campus",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.campus_active.loss-first",
      route: "CP",
      subject: "peer",
      loss: "campus_active",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.campus_active.operation-first",
      route: "CP",
      subject: "peer",
      loss: "campus_active",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.campus_unc.loss-first",
      route: "CP",
      subject: "peer",
      loss: "campus_unc",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.campus_unc.operation-first",
      route: "CP",
      subject: "peer",
      loss: "campus_unc",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.campus_allowlist.loss-first",
      route: "CP",
      subject: "peer",
      loss: "campus_allowlist",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.campus_allowlist.operation-first",
      route: "CP",
      subject: "peer",
      loss: "campus_allowlist",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_missing.loss-first",
      route: "CP",
      subject: "peer",
      loss: "profile_missing",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_missing.operation-first",
      route: "CP",
      subject: "peer",
      loss: "profile_missing",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_required.loss-first",
      route: "CP",
      subject: "peer",
      loss: "profile_required",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_required.operation-first",
      route: "CP",
      subject: "peer",
      loss: "profile_required",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_primary.loss-first",
      route: "CP",
      subject: "peer",
      loss: "profile_primary",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_primary.operation-first",
      route: "CP",
      subject: "peer",
      loss: "profile_primary",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.object_detach_delete.loss-first",
      route: "CP",
      subject: "peer",
      loss: "object_detach_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CP.peer.object_detach_delete.operation-first",
      route: "CP",
      subject: "peer",
      loss: "object_detach_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CP.peer.membership_delete_replace.loss-first",
      route: "CP",
      subject: "peer",
      loss: "membership_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.membership_delete_replace.operation-first",
      route: "CP",
      subject: "peer",
      loss: "membership_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_delete_replace.loss-first",
      route: "CP",
      subject: "peer",
      loss: "profile_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CP.peer.profile_delete_replace.operation-first",
      route: "CP",
      subject: "peer",
      loss: "profile_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.suspended.loss-first",
      route: "CB",
      subject: "actor",
      loss: "suspended",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.suspended.operation-first",
      route: "CB",
      subject: "actor",
      loss: "suspended",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.banned.loss-first",
      route: "CB",
      subject: "actor",
      loss: "banned",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.banned.operation-first",
      route: "CB",
      subject: "actor",
      loss: "banned",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.email_confirmation.loss-first",
      route: "CB",
      subject: "actor",
      loss: "email_confirmation",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.email_confirmation.operation-first",
      route: "CB",
      subject: "actor",
      loss: "email_confirmation",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.email_domain.loss-first",
      route: "CB",
      subject: "actor",
      loss: "email_domain",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.email_domain.operation-first",
      route: "CB",
      subject: "actor",
      loss: "email_domain",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.email_equality.loss-first",
      route: "CB",
      subject: "actor",
      loss: "email_equality",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.email_equality.operation-first",
      route: "CB",
      subject: "actor",
      loss: "email_equality",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.membership_verification.loss-first",
      route: "CB",
      subject: "actor",
      loss: "membership_verification",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.membership_verification.operation-first",
      route: "CB",
      subject: "actor",
      loss: "membership_verification",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.membership_delete.loss-first",
      route: "CB",
      subject: "actor",
      loss: "membership_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.membership_delete.operation-first",
      route: "CB",
      subject: "actor",
      loss: "membership_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.membership_campus.loss-first",
      route: "CB",
      subject: "actor",
      loss: "membership_campus",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.membership_campus.operation-first",
      route: "CB",
      subject: "actor",
      loss: "membership_campus",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.campus_active.loss-first",
      route: "CB",
      subject: "actor",
      loss: "campus_active",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.campus_active.operation-first",
      route: "CB",
      subject: "actor",
      loss: "campus_active",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.campus_unc.loss-first",
      route: "CB",
      subject: "actor",
      loss: "campus_unc",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.campus_unc.operation-first",
      route: "CB",
      subject: "actor",
      loss: "campus_unc",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.campus_allowlist.loss-first",
      route: "CB",
      subject: "actor",
      loss: "campus_allowlist",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.campus_allowlist.operation-first",
      route: "CB",
      subject: "actor",
      loss: "campus_allowlist",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_missing.loss-first",
      route: "CB",
      subject: "actor",
      loss: "profile_missing",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_missing.operation-first",
      route: "CB",
      subject: "actor",
      loss: "profile_missing",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_required.loss-first",
      route: "CB",
      subject: "actor",
      loss: "profile_required",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_required.operation-first",
      route: "CB",
      subject: "actor",
      loss: "profile_required",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_primary.loss-first",
      route: "CB",
      subject: "actor",
      loss: "profile_primary",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_primary.operation-first",
      route: "CB",
      subject: "actor",
      loss: "profile_primary",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.object_detach_delete.loss-first",
      route: "CB",
      subject: "actor",
      loss: "object_detach_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CB.actor.object_detach_delete.operation-first",
      route: "CB",
      subject: "actor",
      loss: "object_detach_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CB.actor.membership_delete_replace.loss-first",
      route: "CB",
      subject: "actor",
      loss: "membership_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.membership_delete_replace.operation-first",
      route: "CB",
      subject: "actor",
      loss: "membership_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_delete_replace.loss-first",
      route: "CB",
      subject: "actor",
      loss: "profile_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.actor.profile_delete_replace.operation-first",
      route: "CB",
      subject: "actor",
      loss: "profile_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.suspended.loss-first",
      route: "CB",
      subject: "peer",
      loss: "suspended",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.suspended.operation-first",
      route: "CB",
      subject: "peer",
      loss: "suspended",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.banned.loss-first",
      route: "CB",
      subject: "peer",
      loss: "banned",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.banned.operation-first",
      route: "CB",
      subject: "peer",
      loss: "banned",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.email_confirmation.loss-first",
      route: "CB",
      subject: "peer",
      loss: "email_confirmation",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.email_confirmation.operation-first",
      route: "CB",
      subject: "peer",
      loss: "email_confirmation",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.email_domain.loss-first",
      route: "CB",
      subject: "peer",
      loss: "email_domain",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.email_domain.operation-first",
      route: "CB",
      subject: "peer",
      loss: "email_domain",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.email_equality.loss-first",
      route: "CB",
      subject: "peer",
      loss: "email_equality",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.email_equality.operation-first",
      route: "CB",
      subject: "peer",
      loss: "email_equality",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.membership_verification.loss-first",
      route: "CB",
      subject: "peer",
      loss: "membership_verification",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.membership_verification.operation-first",
      route: "CB",
      subject: "peer",
      loss: "membership_verification",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.membership_delete.loss-first",
      route: "CB",
      subject: "peer",
      loss: "membership_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.membership_delete.operation-first",
      route: "CB",
      subject: "peer",
      loss: "membership_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.membership_campus.loss-first",
      route: "CB",
      subject: "peer",
      loss: "membership_campus",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.membership_campus.operation-first",
      route: "CB",
      subject: "peer",
      loss: "membership_campus",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.campus_active.loss-first",
      route: "CB",
      subject: "peer",
      loss: "campus_active",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.campus_active.operation-first",
      route: "CB",
      subject: "peer",
      loss: "campus_active",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.campus_unc.loss-first",
      route: "CB",
      subject: "peer",
      loss: "campus_unc",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.campus_unc.operation-first",
      route: "CB",
      subject: "peer",
      loss: "campus_unc",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.campus_allowlist.loss-first",
      route: "CB",
      subject: "peer",
      loss: "campus_allowlist",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.campus_allowlist.operation-first",
      route: "CB",
      subject: "peer",
      loss: "campus_allowlist",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_missing.loss-first",
      route: "CB",
      subject: "peer",
      loss: "profile_missing",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_missing.operation-first",
      route: "CB",
      subject: "peer",
      loss: "profile_missing",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_required.loss-first",
      route: "CB",
      subject: "peer",
      loss: "profile_required",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_required.operation-first",
      route: "CB",
      subject: "peer",
      loss: "profile_required",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_primary.loss-first",
      route: "CB",
      subject: "peer",
      loss: "profile_primary",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_primary.operation-first",
      route: "CB",
      subject: "peer",
      loss: "profile_primary",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.object_detach_delete.loss-first",
      route: "CB",
      subject: "peer",
      loss: "object_detach_delete",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CB.peer.object_detach_delete.operation-first",
      route: "CB",
      subject: "peer",
      loss: "object_detach_delete",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
      observed_wait_resource:
        "public.profiles row: primary detach UPDATE vs held current profile SHARE",
      object_delete_classification:
        "separate lawful sub-action after primary detach; formerly referenced object is no longer current held primary; no successful same-object DELETE/held-primary wait credit",
    },
    {
      id: "L3.CB.peer.membership_delete_replace.loss-first",
      route: "CB",
      subject: "peer",
      loss: "membership_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.membership_delete_replace.operation-first",
      route: "CB",
      subject: "peer",
      loss: "membership_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_delete_replace.loss-first",
      route: "CB",
      subject: "peer",
      loss: "profile_delete_replace",
      order: "loss-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
    {
      id: "L3.CB.peer.profile_delete_replace.operation-first",
      route: "CB",
      subject: "peer",
      loss: "profile_delete_replace",
      order: "operation-first",
      partition: "actual-observed-wait-required",
      status: "unexecuted",
    },
  ].map((cell) => Object.freeze(cell)),
);

export function validateIdentityPlans() {
  const matrix = JSON.parse(
    readFileSync(
      new URL(
        "../../agents/handoffs/TASK-021A1b3c-MATRIX.json",
        import.meta.url,
      ),
    ),
  );
  assert.deepEqual(
    identityPlans,
    matrix.cells.filter((c) => c.id.startsWith("L3.")),
  );
  assert.equal(identityPlans.length, 204);
  assert.equal(new Set(identityPlans.map((c) => c.id)).size, 204);
  for (const route of ["CH", "CP", "CB"])
    for (const subject of route === "CH"
      ? ["actor", "immutable_host"]
      : ["actor", "peer"])
      for (const loss of matrix.identity_loss_dimensions)
        for (const order of ["loss-first", "operation-first"])
          assert.equal(
            identityPlans.filter(
              (c) =>
                c.route === route &&
                c.subject === subject &&
                c.loss === loss &&
                c.order === order &&
                c.status === "unexecuted",
            ).length,
            1,
          );
  return { literal_cells: 204, executed_cells: 0 };
}

const sorted = (rows) =>
  rows
    .slice()
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
// Compare order independently of JSONB serialization; every field and all54 tables remain exact.
function equal54(actual, expected) {
  assert.deepEqual(Object.keys(actual).sort(), censusTables.slice().sort());
  assert.deepEqual(Object.keys(expected).sort(), censusTables.slice().sort());
  for (const table of censusTables)
    assert.deepEqual(sorted(actual[table]), sorted(expected[table]), table);
}
const timestamp = (value) => {
  assert.ok(
    typeof value === "string" && Number.isFinite(Date.parse(value)),
    "server timestamp required",
  );
  return value;
};
function row(snapshot, table, key, id) {
  const found = snapshot[table].filter((r) => r[key] === id);
  assert.equal(found.length, 1, `${table} exact bound subject row`);
  return found[0];
}
// Independently derive every intentional synthetic loss and inherited trigger effect.
// No result rows or observed after-state are copied into this expectation.
export function expectedIdentityLoss(before, cell, route, transactionTime) {
  const expected = structuredClone(before),
    subject = route.subjects[cell.subject];
  const time = timestamp(transactionTime);
  const remove = (table, key) => {
    expected[table] = expected[table].filter((r) => r[key] !== subject);
  };
  const member = () =>
    row(expected, "public.university_memberships", "user_id", subject);
  const profile = () => row(expected, "public.profiles", "user_id", subject);
  switch (cell.loss) {
    case "suspended":
    case "banned":
      row(expected, "public.accounts", "id", subject).status = cell.loss;
      break;
    case "email_confirmation":
      row(expected, "auth.users", "id", subject).email_confirmed_at = null;
      remove("public.university_memberships", "user_id");
      break;
    case "email_domain":
      row(expected, "auth.users", "id", subject).email =
        `${subject}@example.invalid`;
      remove("public.university_memberships", "user_id");
      break;
    case "email_equality":
      member().verification_email = "mismatch@unc.edu";
      break;
    case "membership_verification":
      member().verified_at = null;
      member().verification_email = null;
      break;
    case "membership_delete":
      remove("public.university_memberships", "user_id");
      break;
    case "membership_campus":
      member().university_id = route.otherCampus;
      break;
    case "campus_active":
      row(expected, "public.universities", "id", campus).active = false;
      break;
    case "campus_unc":
      row(expected, "public.universities", "id", campus).slug = "b3c-nonunc";
      break;
    case "campus_allowlist":
      row(expected, "public.universities", "id", campus).allowed_email_domains =
        ["example.invalid"];
      break;
    case "profile_missing":
      remove("public.profiles", "user_id");
      break;
    case "profile_required":
      profile().bio = null;
      profile().revision++;
      profile().is_complete = false;
      break;
    case "profile_primary":
      profile().primary_photo_path = null;
      profile().revision++;
      profile().is_complete = false;
      break;
    case "object_detach_delete":
      profile().primary_photo_path = null;
      profile().revision++;
      profile().is_complete = false;
      expected["storage.objects"] = expected["storage.objects"].filter(
        (r) =>
          !(r.bucket_id === "profile-photos" && r.name === photoPath(subject)),
      );
      break;
    case "membership_delete_replace":
      remove("public.university_memberships", "user_id");
      expected["public.university_memberships"].push({
        user_id: subject,
        university_id: campus,
        verified_at: time,
        verification_email: email(subject),
        created_at: time,
      });
      break;
    case "profile_delete_replace": {
      const original = structuredClone(profile());
      remove("public.profiles", "user_id");
      expected["public.profiles"].push({
        ...original,
        real_name: "Restored fixture",
        major: "Math",
        bio: "Local",
        graduation_year: 2028,
        primary_photo_path: photoPath(subject),
        is_complete: true,
        created_at: time,
        interests: [],
        down_to_do: [],
        favorite_music: null,
        favorite_foods: null,
        weird_fact: null,
        prompts: [],
        instagram: null,
        additional_photo_paths: [],
        revision: 0,
      });
      break;
    }
    default:
      assert.fail(`Unallocated identity loss ${cell.id}`);
  }
  return expected;
}
function marked(owned, prefix) {
  const lines = owned
    .output()
    .split("\n")
    .filter((s) => s.startsWith(prefix));
  assert.equal(lines.length, 1, `one ${prefix} marker required`);
  return JSON.parse(lines[0].slice(prefix.length));
}
const rpcSQL = (route, request = route.request) =>
  route.id === "CB"
    ? `${auth(route.actor)}select 'RESULT:'||to_jsonb(public.set_safety_block(${quote(route.target)},true))::text;reset role;`
    : `${auth(route.actor)}select 'RESULT:'||to_jsonb(r)::text from public.submit_safety_report(${quote(request)},${quote(route.mode)},${quote(route.target)},'harassment',null) r;reset role;`;
const snapshotSQL = `select 'SNAPSHOT:'||(${censusQuery})::text;`;
const beginSQL =
  "begin;set local statement_timeout='12s';set local lock_timeout='10s';select 'TIME:'||to_jsonb(now())::text;";
function diagnostic(owned) {
  const match = /ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/.exec(owned.output());
  return match ? { code: match[1], message: match[2].trim() } : null;
}
function success(owned, exit) {
  assert.equal(exit[0], 0);
  assert.equal(diagnostic(owned), null);
  assert.match(owned.output(), /DONE/);
}
function denied(owned, exit, route) {
  assert.notEqual(exit[0], 0);
  assert.deepEqual(diagnostic(owned), {
    code: "42501",
    message: denialFor(route),
  });
  assert.doesNotMatch(
    owned.output(),
    /RESULT:|DONE|40P01|40001|57014|55P03|deadlock|timeout/i,
  );
}
async function finish(owned) {
  let timer;
  try {
    return await Promise.race([
      owned.done,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error("Owned session exit budget exceeded; incomplete")),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function closeAll(owned) {
  const results = await Promise.allSettled(owned.map((s) => s.close()));
  if (!results.every((r) => r.status === "fulfilled")) {
    const error = new Error(
      "Own children not all awaited; cleanup incomplete; guarded reset forbidden",
    );
    error.cleanupIncomplete = true;
    throw error;
  }
}
// Successful public results validate full report/ledger fields, or exactly one block.
function expectedOperation(before, actual, result, route) {
  const expected = structuredClone(before);
  if (route.id === "CB") {
    const block = { blocker_id: route.actor, blocked_id: route.peer };
    expected["private.people_blocks"].push(block);
    equal54(actual, expected);
    assert.equal(result, true);
  } else {
    assert.deepEqual(Object.keys(result).sort(), [
      "receipt_id",
      "submitted_at",
    ]);
    assert.match(result.receipt_id, /^[0-9a-f]{8}-[0-9a-f-]{27}$/);
    timestamp(result.submitted_at);
    const report = {
      id: result.receipt_id,
      submitted_at: result.submitted_at,
      reporter_id: route.actor,
      target_type: route.mode,
      target_id: route.target,
      category: "harassment",
      narrative: null,
      provenance_kind: route.provenance,
      provenance_ref_id: route.target,
    };
    const fingerprint = sql(
      `select md5(jsonb_build_array(${quote(route.mode)},${quote(route.target)}::uuid,'harassment',null)::text)`,
    );
    const ledger = {
      reporter_id: route.actor,
      request_id: route.request,
      input_fingerprint: fingerprint,
      report_id: result.receipt_id,
    };
    expected["private.safety_reports"].push(report);
    expected["private.safety_report_requests"].push(ledger);
    equal54(actual, expected);
    assertReportOutcome(route, {
      before,
      after: actual,
      receipt: result,
      expectedReport: report,
      expectedLedger: ledger,
    });
  }
  return expected;
}
async function positiveRollback(route, cell) {
  const before = census(),
    owned = session(`${cell.id}.positive`);
  try {
    owned.send(
      `${beginSQL}${rpcSQL(route)}${snapshotSQL}select 'DONE';rollback;`,
    );
    owned.child.stdin.end();
    success(owned, await finish(owned));
    // Block helper requires committed retained evidence; rollback positive checks directly.
    const result = marked(owned, "RESULT:"),
      after = marked(owned, "SNAPSHOT:");
    if (route.id === "CB") {
      assert.equal(result, true);
      const expected = structuredClone(before);
      expected["private.people_blocks"].push({
        blocker_id: route.actor,
        blocked_id: route.peer,
      });
      equal54(after, expected);
    } else expectedOperation(before, after, result, route);
    equal54(census(), before);
    return { result, full54_rollback: true };
  } finally {
    await closeAll([owned]);
  }
}
async function observedWait(cell, holderName, waiterName) {
  let observation;
  await until(() => {
    observation = JSON.parse(
      sql(`select coalesce((select jsonb_build_object(
      'cell',${quote(cell.id)},'holder_pid',h.pid,'waiter_pid',w.pid,
      'blocking_pids',pg_blocking_pids(w.pid),'wait_event_type',w.wait_event_type,
      'ungranted_locks',(select jsonb_agg(jsonb_build_object('locktype',l.locktype,'mode',l.mode,
        'relation',l.relation::regclass::text,'transactionid',l.transactionid::text,'granted',l.granted))
        from pg_locks l where l.pid=w.pid and not l.granted))
      from pg_stat_activity h cross join pg_stat_activity w
      where h.application_name=${quote(holderName)} and w.application_name=${quote(waiterName)}
      and h.pid<>w.pid and w.wait_event_type='Lock' and h.pid=any(pg_blocking_pids(w.pid))
      and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)),'null'::jsonb)`),
    );
    return observation !== null;
  });
  assert.ok(observation.blocking_pids.includes(observation.holder_pid));
  assert.ok(observation.ungranted_locks.length > 0);
  return observation;
}
async function freshAfterLoss(route, cell, replacement) {
  const before = census();
  // Intentional synthetic fixture-only unblock avoids crediting lawful retained authority as denial.
  if (route.id === "CB") {
    sql(
      `delete from private.people_blocks where blocker_id=${quote(route.actor)} and blocked_id=${quote(route.peer)}`,
    );
    const expected = structuredClone(before);
    expected["private.people_blocks"] = expected[
      "private.people_blocks"
    ].filter(
      (r) => !(r.blocker_id === route.actor && r.blocked_id === route.peer),
    );
    equal54(census(), expected);
  }
  assertCurrentOnly(route);
  const baseline = census(),
    owned = session(`${cell.id}.fresh`);
  const freshRoute = { ...route, request: caseIds(`${cell.id}.fresh`).request };
  try {
    owned.send(
      `${beginSQL}${rpcSQL(freshRoute)}${snapshotSQL}select 'DONE';rollback;`,
    );
    owned.child.stdin.end();
    const exit = await finish(owned);
    if (replacement) {
      success(owned, exit);
      if (route.id === "CB") {
        assert.equal(marked(owned, "RESULT:"), true);
        const expected = structuredClone(baseline);
        expected["private.people_blocks"].push({
          blocker_id: route.actor,
          blocked_id: route.peer,
        });
        equal54(marked(owned, "SNAPSHOT:"), expected);
      } else
        expectedOperation(
          baseline,
          marked(owned, "SNAPSHOT:"),
          marked(owned, "RESULT:"),
          freshRoute,
        );
    } else denied(owned, exit, route);
    equal54(census(), baseline);
    return {
      fresh_lane: "current",
      expected: replacement
        ? "eligible replacement success under rollback"
        : "42501 neutral denial",
      full54_rollback: true,
      fixture_unblock: route.id === "CB",
      retained_success_current_denial_credit: false,
    };
  } finally {
    await closeAll([owned]);
  }
}
async function runIdentityCell(cell) {
  assert.ok(identityPlans.includes(cell), "exact literal matrix cell required");
  const route = prepare(
    routes.find((r) => r.id === cell.route),
    {
      caseKey: cell.id,
      actorPreference: cell.order === "operation-first" ? false : "absent",
    },
  );
  const subject = route.subjects[cell.subject],
    loss = identityLoss(cell.loss, subject, route);
  const positive = await positiveRollback(route, cell),
    before = census(),
    owned = [];
  let observed, committed, operationResult, blocker;
  try {
    const holderName = `${cell.id}.holder`,
      waiterName = `${cell.id}.waiter`;
    const holder = session(holderName);
    owned.push(holder);
    const waiter = session(waiterName);
    owned.push(waiter);
    const lossFirst = cell.order === "loss-first";
    holder.send(
      `${beginSQL}${lossFirst ? loss.loss : rpcSQL(route)}${snapshotSQL}select 'HELD';`,
    );
    await until(
      () => holder.output().includes("HELD") || diagnostic(holder) !== null,
    );
    assert.equal(
      diagnostic(holder),
      null,
      "holder failure is a blocker, never wait-order credit",
    );
    const holderSnapshot = marked(holder, "SNAPSHOT:");
    const expectedHolder = lossFirst
      ? expectedIdentityLoss(before, cell, route, marked(holder, "TIME:"))
      : expectedOperation(
          before,
          holderSnapshot,
          marked(holder, "RESULT:"),
          route,
        );
    equal54(holderSnapshot, expectedHolder);
    waiter.send(
      `${beginSQL}${lossFirst ? rpcSQL(route) : loss.loss}${snapshotSQL}select 'DONE';commit;`,
    );
    observed = await observedWait(cell, holderName, waiterName);
    holder.send("select 'DONE';commit;");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const [holderExit, waiterExit] = await Promise.all([
      finish(holder),
      finish(waiter),
    ]);
    success(holder, holderExit);
    if (lossFirst) {
      denied(waiter, waiterExit, route);
      committed = expectedHolder;
    } else {
      success(waiter, waiterExit);
      committed = expectedIdentityLoss(
        expectedHolder,
        cell,
        route,
        marked(waiter, "TIME:"),
      );
      equal54(marked(waiter, "SNAPSHOT:"), committed);
      operationResult = marked(holder, "RESULT:");
    }
    equal54(census(), committed);
    if (!lossFirst && route.id !== "CB")
      assertStoredProvenance(route, operationResult);
    const fresh = await freshAfterLoss(route, cell, loss.replacement);
    return {
      id: cell.id,
      route: cell.route,
      subject: cell.subject,
      subject_id: subject,
      loss: cell.loss,
      order: cell.order,
      phase: loss.contention,
      writer: loss.writer,
      status: "observed-successful-order",
      positive,
      observed_wait: observed,
      expected_outcome: lossFirst
        ? {
            code: "42501",
            message: denialFor(route),
            full54_operation_rollback: true,
          }
        : {
            result: operationResult,
            provenance: route.provenance,
            loss_committed: true,
          },
      full54_expected: committed,
      fresh,
      replacement: loss.replacement,
      original_tuple_waiter:
        lossFirst && loss.replacement
          ? "denied immediately after original tuple disappeared; eligible replacement did not rescue"
          : "not replacement loss-first",
    };
  } catch (error) {
    // No retry or serial substitution. Exact cell remains incomplete, even for safe external-sync aborts.
    blocker = {
      id: cell.id,
      status: "blocked-uncredited",
      route: cell.route,
      subject: cell.subject,
      loss: cell.loss,
      order: cell.order,
      phase: loss.contention,
      writer: loss.writer,
      observed_wait: observed ?? null,
      reason: String(error.message),
      diagnostics: owned.map(diagnostic),
      successful_order_credit: false,
      full54_before: before,
    };
    return blocker;
  } finally {
    await closeAll(owned);
    if (blocker) {
      blocker.full54_after = census();
      // A successful winner may stand while a loser aborts; never erase or falsely call it whole-race rollback.
      try {
        equal54(blocker.full54_after, before);
        blocker.full54_race_rollback = true;
      } catch {
        blocker.full54_race_rollback = false;
        blocker.committed_winner_or_unexplained_delta = true;
      }
      blocker.abort_partition = blocker.diagnostics.some(
        (d) => d && ["40P01", "40001"].includes(d.code),
      );
      blocker.abort_credit = false;
    }
  }
}
// Explicit invocation belongs solely to the later reviewed, exclusive serial executor.
// Import and validateIdentityPlans are inert/static; this authoring task never invokes this function.
export async function runIdentityPlans({ exclusiveSerialRelease } = {}) {
  assert.equal(
    exclusiveSerialRelease,
    "TASK-021A1b3c-reviewed-final-fixtures",
    "coordinator runtime release required",
  );
  validateIdentityPlans();
  // Frozen foundation synchronous target guards/SQL have no timeout. Event-loop timers
  // cannot bound execFileSync, and wrapper termination cannot prove awaited nested target children.
  // A separately reviewed transport correction is required; do not fake finite-suite evidence.
  assert.fail(
    "All204 L3 identity cells execution blocked: frozen pilot-admission-current-safety.mjs targetGuard/rawSql/localTarget/session/send use unbounded execFileSync; bounded owned transport and final cleanup must be independently reviewed before release",
  );
  localTarget("current27");
  assertClean();
  const outcomes = [];
  let ownedChildrenAwaited = true;
  try {
    for (const cell of identityPlans) {
      resetDisposable("current27");
      const outcome = await runIdentityCell(cell);
      outcomes.push(outcome);
      if (outcome.status !== "observed-successful-order") break;
    }
    assert.equal(
      outcomes.length,
      204,
      "every literal allocation must actually complete",
    );
    assert.ok(outcomes.every((o) => o.status === "observed-successful-order"));
    return outcomes;
  } catch (error) {
    if (error.cleanupIncomplete) ownedChildrenAwaited = false;
    throw error;
  } finally {
    if (ownedChildrenAwaited) {
      resetDisposable("current27");
      assertClean();
    }
  }
}

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

import {
  projectOutgoingEvidence,
  projectFailureEvidence,
  projectCensusEvidence,
  projectDifferences,
  differences,
  neutralSuiteError,
  originalSuiteError,
} from "./pilot-admission-current-safety-concurrency.integration.mjs";

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

export function identitySessionNames(cell) {
  assert.ok(
    identityPlans.includes(cell),
    "exact literal identity cell required",
  );
  const digest = createHash("sha256")
    .update(cell.id)
    .digest("hex")
    .slice(0, 24);
  return Object.freeze(
    Object.fromEntries(
      ["holder", "waiter", "positive", "fresh"].map((role) => [
        role,
        `b3c_identity_${digest}_${role}`,
      ]),
    ),
  );
}

// Raw census, outcomes, receipts and first errors never leave these private stores.
const rawEvidence = new WeakMap();
const errorState = new WeakMap();
const sessions = new WeakMap();
const ownedBindings = new Map();
const own = (value, key) => {
  try {
    const d = Object.getOwnPropertyDescriptor(value ?? {}, key);
    return d && Object.hasOwn(d, "value") ? d.value : undefined;
  } catch {
    return undefined;
  }
};
export const identityOutputManifest = Object.freeze({
  routes: Object.freeze(["CH", "CP", "CB"]),
  subjects: Object.freeze(["actor", "peer", "immutable_host"]),
  orders: Object.freeze(["loss-first", "operation-first"]),
  losses: Object.freeze([
    "suspended",
    "banned",
    "email_confirmation",
    "email_domain",
    "email_equality",
    "membership_verification",
    "membership_delete",
    "membership_campus",
    "campus_active",
    "campus_unc",
    "campus_allowlist",
    "profile_missing",
    "profile_required",
    "profile_primary",
    "object_detach_delete",
    "membership_delete_replace",
    "profile_delete_replace",
  ]),
  phases: Object.freeze([
    "account",
    "Auth",
    "membership",
    "campus",
    "profile",
    "profile UPDATE; formerly referenced DELETE after detach",
  ]),
  writers: Object.freeze([
    "privileged synthetic identity preparation; not permission evidence",
  ]),
  statuses: Object.freeze(["observed-successful-order", "blocked-uncredited"]),
  partitions: Object.freeze([
    "actual-observed-wait-required",
    "failed-no-success-credit",
    "supplemental-failure-no-credit",
    "cleanup-failed",
  ]),
  classifications: Object.freeze([
    "whole-race-rollback",
    "known-lawful-committed-survivor",
    "unexplained-delta",
    "observation-unavailable",
    "settlement-unavailable",
  ]),
  suites: Object.freeze(["identity-suite"]),
});
function contextEnvelope(input, cell) {
  const result = {};
  if (!identityPlans.includes(cell) || own(input, "id") !== cell.id)
    return result;
  for (const key of ["route", "subject", "loss", "order"])
    if (own(input, key) !== undefined && own(input, key) !== cell[key])
      return result;
  const route = routes.find((r) => r.id === cell.route);
  const loss = identityLoss(cell.loss, "bound-subject", {
    ...route,
    subjects: { [cell.subject]: "bound-subject" },
    otherCampus: "bound-campus",
  });
  for (const [key, expected] of [
    ["phase", loss.contention],
    ["writer", loss.writer],
  ])
    if (own(input, key) !== undefined && own(input, key) !== expected)
      return {};
  for (const [key, expected] of Object.entries({
    id: cell.id,
    route: cell.route,
    subject: cell.subject,
    loss: cell.loss,
    order: cell.order,
    phase: loss.contention,
    writer: loss.writer,
  }))
    if (own(input, key) === expected) result[key] = expected;
  if (own(input, "phase") === loss.contention)
    result.wait_resource = loss.contention;
  for (const [key, values] of [
    ["status", identityOutputManifest.statuses],
    ["partition", identityOutputManifest.partitions],
    ["classification", identityOutputManifest.classifications],
  ])
    if (values.includes(own(input, key))) result[key] = own(input, key);
  return result;
}
function outgoing(input, cell = null) {
  const projected = projectOutgoingEvidence(input);
  const result = {
    ...projected,
    identity_context: contextEnvelope(input, cell),
  };
  for (const key of ["full54_before", "full54_after", "full54_expected"])
    if (own(input, key) !== undefined)
      result[key] = projectCensusEvidence(own(input, key));
  if (own(input, "observed_wait") !== undefined)
    result.observation = projectOutgoingEvidence({
      observation: own(input, "observed_wait"),
    }).observation;
  rawEvidence.set(result, input);
  return result;
}
const raw = (value) => rawEvidence.get(value);
function privateState(error) {
  return (
    errorState.get(error) ?? {
      original: originalSuiteError(error),
      cleanupIncomplete: false,
    }
  );
}
function safeError(original, state = {}, cell = null) {
  const first = privateState(original).original;
  const carrier = new Error(
    "Identity fixture incomplete; projected evidence only",
  );
  const safe = neutralSuiteError(carrier);
  errorState.set(safe, {
    ...privateState(original),
    ...state,
    original: first,
  });
  try {
    safe.evidence = outgoing(
      {
        id: cell?.id,
        ...state.outcome,
        cleanupIncomplete: state.cleanupIncomplete === true,
        reset_forbidden: true,
        successful_wait_order_credit: false,
        observed_wait_credit: 0,
        error: first,
      },
      cell,
    );
    if (state.outcomes)
      safe.evidence.outcomes = state.outcomes.map((outcome) =>
        outgoing(
          outcome,
          identityPlans.find((c) => c.id === own(outcome, "id")),
        ),
      );
  } catch (outputError) {
    const privateError = errorState.get(safe);
    (privateError.outputErrors ??= []).push(outputError);
    safe.evidence = {
      unavailable: true,
      reset_forbidden: true,
      successful_wait_order_credit: false,
      observed_wait_credit: 0,
    };
  }
  return safe;
}
function failureRecord(
  original,
  cell,
  state,
  snapshot = null,
  observationError = null,
) {
  const carrier = new Error(
    "Identity fixture incomplete; projected evidence only",
  );
  const first = privateState(original).original;
  const message = own(first, "message");
  if (typeof message === "string") carrier.message = message;
  const sqlDiagnostics = own(first, "sqlDiagnostics");
  if (Array.isArray(sqlDiagnostics)) carrier.sqlDiagnostics = sqlDiagnostics;
  const preciseDifferences = own(first, "preciseDifferences");
  if (Array.isArray(preciseDifferences))
    carrier.preciseDifferences = preciseDifferences;
  try {
    const record = projectFailureEvidence(
      carrier,
      {
        id: cell?.id,
        diagnostics: state?.diagnostics ?? [],
        observation: state?.observed_wait,
      },
      snapshot,
      observationError,
    );
    const output = {
      ...record,
      identity_context: contextEnvelope(state ?? {}, cell),
      original: projectOutgoingEvidence({
        error: privateState(original).original,
      }),
    };
    console.error(JSON.stringify(output));
  } catch (error) {
    if (state) (state.outputErrors ??= []).push(error);
  }
}
function captureBeforeCleanup(error, cell, group) {
  const state = { ...cell, diagnostics: group.map(diagnostic) };
  let snapshot = null,
    observationError = null;
  const privateError = privateState(error);
  if (!privateError.cleanupIncomplete) {
    try {
      snapshot = census();
    } catch (failure) {
      observationError = failure;
    }
  }
  errorState.set(error, {
    ...privateError,
    precleanup: { snapshot, observationError, state },
  });
  failureRecord(privateError.original, cell, state, snapshot, observationError);
}
export function identityObservationFailure(blocker, observationError) {
  const outcome = raw(blocker) ?? blocker;
  outcome.full54_after_unavailable = "post-closure census unavailable";
  outcome.observation_error = observationError;
  outcome.full54_race_rollback = null;
  const first = own(outcome, "originalError") ?? observationError;
  return safeError(
    first,
    { outcome, observationError, cleanupIncomplete: true },
    identityPlans.find((c) => c.id === own(outcome, "id")),
  );
}
export function identitySuiteFailure(
  outcomes,
  cause = null,
  activeCell = null,
) {
  const originals = outcomes.map((value) => raw(value) ?? value);
  const blocked = originals.find(
    (value) => own(value, "status") !== "observed-successful-order",
  );
  const cell = identityPlans.find(
    (c) => c.id === (own(blocked, "id") ?? activeCell),
  );
  const original =
    cause ??
    own(blocked, "originalError") ??
    new Error("All204 outcomes required");
  return safeError(
    original,
    {
      outcomes: originals,
      outcome: blocked,
      cleanupIncomplete: privateState(original).cleanupIncomplete,
    },
    cell,
  );
}

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
  const names = identityPlans.flatMap((cell) =>
    Object.values(identitySessionNames(cell)),
  );
  for (const name of names) {
    assert.match(name, /^[a-z0-9_]+$/);
    assert.ok(
      name.length <= 63,
      "ASCII PostgreSQL application_name must fit63 bytes",
    );
  }
  assert.equal(
    new Set(names).size,
    816,
    "all204 cells ×4 roles collision-free before/after PG truncation",
  );
  return {
    literal_cells: 204,
    executed_cells: 0,
    unique_session_names: 816,
    max_session_name_bytes: Math.max(...names.map((name) => name.length)),
  };
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
  validateExit(exit);
  assert.equal(exit[0], 0);
  assert.equal(diagnostic(owned), null);
  assert.match(owned.output(), /DONE/);
  sessions.get(owned).accepted = true;
}
function denied(owned, exit, route) {
  validateExit(exit);
  assert.equal(
    [...owned.output().matchAll(/ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/g)]
      .length,
    1,
    "one exact approved denial diagnostic required",
  );
  assert.notEqual(exit[0], 0);
  assert.deepEqual(diagnostic(owned), {
    code: "42501",
    message: denialFor(route),
  });
  assert.doesNotMatch(
    owned.output(),
    /RESULT:|DONE|40P01|40001|57014|55P03|deadlock|timeout/i,
  );
  sessions.get(owned).expectedDenial = true;
}
async function finishInner(owned) {
  let timer;
  try {
    const receipt = await Promise.race([
      owned.done,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(new Error("Owned session exit budget exceeded; incomplete")),
          15000,
        );
      }),
    ]);
    validateExit(receipt);
    sessions.get(owned).receipt = receipt;
    return outgoing({ receipt });
  } finally {
    clearTimeout(timer);
  }
}
function validateExit(receipt) {
  assert.ok(
    Array.isArray(receipt) &&
      receipt.length === 2 &&
      Number.isInteger(receipt[0]) &&
      receipt[1] === null,
    "exact normal exit required",
  );
}
async function bindSessionInner(owned, name) {
  owned.send(
    "select 'BIND:'||jsonb_build_object('pid',pg_backend_pid(),'name',current_setting('application_name'))::text;",
  );
  await until(
    () => owned.output().includes("BIND:") || diagnostic(owned) !== null,
  );
  const binding = marked(owned, "BIND:");
  assert.ok(
    Number.isSafeInteger(binding.pid) &&
      binding.pid > 0 &&
      binding.name === name,
  );
  const state = sessions.get(owned);
  assert.ok(
    !state.binding &&
      !state.group.some(
        (s) => s !== owned && sessions.get(s)?.binding?.pid === binding.pid,
      ),
  );
  assert.ok(
    !ownedBindings.has(binding.pid) || ownedBindings.get(binding.pid) === name,
    "conflicting reused backend binding",
  );
  ownedBindings.set(binding.pid, name);
  state.binding = binding;
  return outgoing({ backend_binding: binding });
}
function createSession(name, group) {
  const owned = session(name);
  group.push(owned);
  sessions.set(owned, { name, group, accepted: false, expectedDenial: false });
  return owned;
}
function assertAbsentBackend(binding, name, count) {
  assert.ok(
    binding &&
      Number.isSafeInteger(binding.pid) &&
      binding.pid > 0 &&
      binding.name === name,
    "owned PID/name binding required",
  );
  assert.equal(
    count,
    0,
    "owned backend/leader/name survivor; observation/reset forbidden",
  );
}
function requireBackendAbsence(owned) {
  if (owned.length === 0) return;
  localTarget("current27");
  for (const child of owned) {
    const state = sessions.get(child),
      binding = state?.binding;
    assert.ok(
      binding,
      "missing owned backend binding; observation/reset forbidden",
    );
    const count = JSON.parse(
      sql(
        `select count(*) from pg_stat_activity where pid=${binding.pid} or leader_pid=${binding.pid} or application_name=${quote(state.name)}`,
      ),
    );
    assertAbsentBackend(binding, state.name, count);
  }
}
async function awaitOwnedClose(child) {
  const [closed, done] = await Promise.allSettled([
    Promise.resolve().then(() => child.close()),
    Promise.resolve().then(() => child.done),
  ]);
  assert.equal(closed.status, "fulfilled");
  assert.equal(done.status, "fulfilled");
  validateExit(done.value);
  const state = sessions.get(child);
  state.receipt = done.value;
  const d = diagnostic(child);
  state.abort = Boolean(
    d &&
    [...child.output().matchAll(/ERROR:\s+([A-Z0-9]{5}):\s*([^\r\n]*)/g)]
      .length === 1 &&
    ((d.code === "40P01" && d.message === "deadlock detected") ||
      (d.code === "40001" &&
        [
          "could not serialize access due to concurrent update",
          "could not serialize access due to read/write dependencies among transactions",
        ].includes(d.message))),
  );
  assert.ok(
    done.value[0] === 0 || state.expectedDenial || state.abort,
    "unaccepted nonzero completion; observation/reset forbidden",
  );
  return outgoing({ receipt: done.value });
}
async function closeAll(owned) {
  const results = await Promise.allSettled(owned.map(awaitOwnedClose));
  if (!results.every((r) => r.status === "fulfilled")) {
    throw safeError(results.find((r) => r.status === "rejected").reason, {
      cleanupIncomplete: true,
    });
  }
  try {
    requireBackendAbsence(owned);
  } catch (error) {
    throw safeError(error, { cleanupIncomplete: true });
  }
  return outgoing({ owned_children_awaited: true });
}
function acceptDenial(owned, zeroMutationVerified) {
  assert.equal(
    zeroMutationVerified,
    true,
    "independent full54 zero mutation required",
  );
  const state = sessions.get(owned);
  assert.ok(state.expectedDenial && state.receipt);
  state.accepted = true;
}
function requireAccepted(owned) {
  assert.ok(
    owned.every((child) => sessions.get(child)?.accepted),
    "every owned completion must be accepted before reset",
  );
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
async function positiveRollbackInner(route, cell) {
  const before = census(),
    group = [];
  let original = null;
  try {
    const owned = createSession(identitySessionNames(cell).positive, group);
    await bindSession(owned, identitySessionNames(cell).positive);
    owned.send(
      `${beginSQL}${rpcSQL(route)}${snapshotSQL}select 'DONE';rollback;`,
    );
    owned.child.stdin.end();
    success(owned, raw(await finish(owned)).receipt);
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
    await closeAll(group);
    equal54(census(), before);
    requireAccepted(group);
    return outgoing(
      { ...cell, result, full54_rollback: true, full54_verified: true },
      cell,
    );
  } catch (error) {
    original = error;
    captureBeforeCleanup(error, cell, group);
    throw safeError(error, {}, cell);
  } finally {
    try {
      await closeAll(group);
    } catch (error) {
      throw safeError(
        original ?? error,
        { cleanupIncomplete: true, closeError: error },
        cell,
      );
    }
  }
}
async function observedWaitInner(cell, holderName, waiterName) {
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
  return outgoing({ observation }, cell);
}
async function freshAfterLossInner(route, cell, replacement) {
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
    group = [];
  let original = null;
  const freshRoute = { ...route, request: caseIds(`${cell.id}.fresh`).request };
  try {
    const owned = createSession(identitySessionNames(cell).fresh, group);
    await bindSession(owned, identitySessionNames(cell).fresh);
    owned.send(
      `${beginSQL}${rpcSQL(freshRoute)}${snapshotSQL}select 'DONE';rollback;`,
    );
    owned.child.stdin.end();
    const exit = raw(await finish(owned)).receipt;
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
    await closeAll(group);
    equal54(census(), baseline);
    if (!replacement) acceptDenial(owned, true);
    requireAccepted(group);
    return outgoing(
      {
        ...cell,
        full54_verified: true,
        diagnostic: replacement
          ? null
          : { code: "42501", message: denialFor(route) },
        fresh_lane: "current",
        expected: replacement
          ? "eligible replacement success under rollback"
          : "42501 neutral denial",
        full54_rollback: true,
        fixture_unblock: route.id === "CB",
        retained_success_current_denial_credit: false,
      },
      cell,
    );
  } catch (error) {
    original = error;
    captureBeforeCleanup(error, cell, group);
    throw safeError(error, {}, cell);
  } finally {
    try {
      await closeAll(group);
    } catch (error) {
      throw safeError(
        original ?? error,
        { cleanupIncomplete: true, closeError: error },
        cell,
      );
    }
  }
}
async function runIdentityCellInner(cell) {
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
  let observed,
    committed,
    knownCommitted,
    operationResult,
    blocker,
    blockedOutput;
  try {
    const { holder: holderName, waiter: waiterName } =
      identitySessionNames(cell);
    const holder = createSession(holderName, owned);
    await bindSession(holder, holderName);
    const waiter = createSession(waiterName, owned);
    await bindSession(waiter, waiterName);
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
    observed = raw(
      await observedWait(cell, holderName, waiterName),
    ).observation;
    assert.equal(observed.holder_pid, sessions.get(holder).binding.pid);
    assert.equal(observed.waiter_pid, sessions.get(waiter).binding.pid);
    holder.send("select 'DONE';commit;");
    holder.child.stdin.end();
    waiter.child.stdin.end();
    const [holderExit, waiterExit] = await Promise.all([
      finish(holder),
      finish(waiter),
    ]);
    success(holder, raw(holderExit).receipt);
    knownCommitted = expectedHolder;
    if (lossFirst) {
      denied(waiter, raw(waiterExit).receipt, route);
      committed = expectedHolder;
    } else {
      success(waiter, raw(waiterExit).receipt);
      committed = expectedIdentityLoss(
        expectedHolder,
        cell,
        route,
        marked(waiter, "TIME:"),
      );
      equal54(marked(waiter, "SNAPSHOT:"), committed);
      operationResult = marked(holder, "RESULT:");
    }
    await closeAll(owned);
    equal54(census(), committed);
    if (lossFirst) acceptDenial(waiter, true);
    requireAccepted(owned);
    if (!lossFirst && route.id !== "CB")
      assertStoredProvenance(route, operationResult);
    const fresh = await freshAfterLoss(route, cell, loss.replacement);
    return outgoing(
      {
        id: cell.id,
        route: cell.route,
        subject: cell.subject,
        subject_id: subject,
        loss: cell.loss,
        order: cell.order,
        phase: loss.contention,
        writer: loss.writer,
        status: "observed-successful-order",
        positive: raw(positive),
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
        full54_verified: true,
        diagnostic: lossFirst
          ? { code: "42501", message: denialFor(route) }
          : null,
        public_result: operationResult,
        fresh: raw(fresh),
        replacement: loss.replacement,
        original_tuple_waiter:
          lossFirst && loss.replacement
            ? "denied immediately after original tuple disappeared; eligible replacement did not rescue"
            : "not replacement loss-first",
      },
      cell,
    );
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
      reason: own(privateState(error).original, "message"),
      originalError: privateState(error).original,
      diagnostics: owned.map(diagnostic),
      successful_order_credit: false,
      full54_before: before,
    };
    // Classify already-observed abort diagnostics before any fallible cleanup/observation.
    blocker.abort_partition = blocker.diagnostics.some(
      (d) => d && ["40P01", "40001"].includes(d.code),
    );
    blocker.abort_credit = false;
    if (!privateState(error).cleanupIncomplete) {
      try {
        blocker.precleanup_census = census();
      } catch (observationError) {
        blocker.precleanup_observation_error = observationError;
      }
    }
    failureRecord(
      error,
      cell,
      blocker,
      blocker.precleanup_census ?? null,
      blocker.precleanup_observation_error ?? null,
    );
    blockedOutput = outgoing(blocker, cell);
    return blockedOutput;
  } finally {
    try {
      await closeAll(owned);
    } catch (error) {
      if (blocker) {
        blocker.owned_children_awaited = false;
        blocker.classification = "settlement-unavailable";
        failureRecord(blocker.originalError, cell, blocker, null, error);
      }
      throw safeError(
        blocker?.originalError ?? error,
        { outcome: blocker, cleanupIncomplete: true, closeError: error },
        cell,
      );
    }
    if (blocker) {
      blocker.owned_children_awaited = true;
      try {
        blocker.full54_after = census();
      } catch (observationError) {
        blocker.classification = "observation-unavailable";
        failureRecord(
          blocker.originalError,
          cell,
          blocker,
          null,
          observationError,
        );
        throw identityObservationFailure(
          outgoing(blocker, cell),
          observationError,
        );
      }
      const expected = committed ?? knownCommitted ?? before;
      const delta = differences(expected, blocker.full54_after);
      blocker.full54_race_rollback = false;
      if (!knownCommitted && !committed) {
        try {
          equal54(blocker.full54_after, before);
          blocker.full54_race_rollback = true;
        } catch {
          blocker.full54_race_rollback = false;
        }
      } else {
        try {
          equal54(blocker.full54_after, expected);
        } catch (error) {
          blocker.survivorAssertionError = error;
        }
      }
      blocker.classification = delta.length
        ? "unexplained-delta"
        : knownCommitted || committed
          ? "known-lawful-committed-survivor"
          : "whole-race-rollback";
      blocker.committed_winner_or_unexplained_delta = Boolean(
        knownCommitted || committed || delta.length,
      );
      // Always supplemental, even after a first record. Exact original values feed the projector.
      failureRecord(blocker.originalError, cell, blocker, blocker.full54_after);
      if (blockedOutput) Object.assign(blockedOutput, outgoing(blocker, cell));
      if (delta.length) {
        try {
          console.error(
            JSON.stringify({
              identity_context: contextEnvelope(blocker, cell),
              partition: "supplemental-failure-no-credit",
              differences: projectDifferences(delta),
              before: projectCensusEvidence(expected),
              after: projectCensusEvidence(blocker.full54_after),
            }),
          );
        } catch (error) {
          (blocker.outputErrors ??= []).push(error);
        }
      }
    }
  }
}
async function finish(owned) {
  try {
    return await finishInner(owned);
  } catch (error) {
    throw safeError(error, { cleanupIncomplete: true });
  }
}
async function bindSession(owned, name) {
  try {
    return await bindSessionInner(owned, name);
  } catch (error) {
    throw safeError(error, { cleanupIncomplete: true });
  }
}
async function observedWait(cell, holderName, waiterName) {
  try {
    return await observedWaitInner(cell, holderName, waiterName);
  } catch (error) {
    throw safeError(error, {}, cell);
  }
}
async function positiveRollback(route, cell) {
  try {
    return await positiveRollbackInner(route, cell);
  } catch (error) {
    throw safeError(error, privateState(error), cell);
  }
}
async function freshAfterLoss(route, cell, replacement) {
  try {
    return await freshAfterLossInner(route, cell, replacement);
  } catch (error) {
    throw safeError(error, privateState(error), cell);
  }
}
async function runIdentityCell(cell) {
  try {
    return await runIdentityCellInner(cell);
  } catch (error) {
    const state = privateState(error);
    if (!state.outcome && !state.cleanupIncomplete) {
      let snapshot = null,
        observationError = null;
      try {
        snapshot = census();
      } catch (failure) {
        observationError = failure;
      }
      failureRecord(state.original, cell, cell, snapshot, observationError);
    }
    throw safeError(error, state, cell);
  }
}
// Explicit invocation belongs solely to the later reviewed, exclusive serial executor.
// Import and validateIdentityPlans are inert/static; this authoring task never invokes this function.
function requireReviewedIdentityRelease() {
  assert.fail(
    "Identity execution refused: independent combined fixture/ownership review and exclusive serial release remain required",
  );
}
async function runIdentityPlansInner(options) {
  requireReviewedIdentityRelease();
  assert.equal(
    own(options, "exclusiveSerialRelease"),
    "TASK-021A1b3c-reviewed-final-fixtures",
  );
  validateIdentityPlans();
  localTarget("current27");
  assertClean();
  const outcomes = [];
  let failure = null,
    activeCell = null,
    successful = false;
  try {
    for (const cell of identityPlans) {
      activeCell = cell.id;
      resetDisposable("current27");
      const outcome = await runIdentityCell(cell);
      outcomes.push(outcome);
      if (raw(outcome).status !== "observed-successful-order")
        throw identitySuiteFailure(outcomes);
    }
    assert.equal(
      outcomes.length,
      204,
      "every literal allocation must actually complete",
    );
    assert.ok(
      outcomes.every((o) => raw(o).status === "observed-successful-order"),
    );
    successful = true;
    const output = { suite: "identity-suite", outcomes };
    rawEvidence.set(output, { outcomes: outcomes.map(raw) });
    return output;
  } catch (error) {
    failure = identitySuiteFailure(outcomes, error, activeCell);
    const state = privateState(error);
    failureRecord(
      state.original,
      identityPlans.find((c) => c.id === activeCell),
      state.outcome ?? {},
    );
    throw failure;
  } finally {
    // A failed cell never resets, even when independent settlement allowed observation.
    if (successful && !failure) {
      try {
        resetDisposable("current27");
        assertClean();
      } catch (error) {
        failureRecord(error, null, {});
        throw identitySuiteFailure(
          outcomes,
          safeError(error, { cleanupIncomplete: true }),
          activeCell,
        );
      }
    }
  }
}
export async function runIdentityPlans(options = {}) {
  try {
    return await runIdentityPlansInner(options);
  } catch (error) {
    throw safeError(error, privateState(error));
  }
}

// Dormant pure/mocked examples. Never registered or invoked by import or actual suite.
export async function runIdentityOutputExamples() {
  let checks = 0;
  const check = (fn) => {
    fn();
    checks++;
  };
  const cell = identityPlans[0];
  const context = {
    ...cell,
    phase: "account",
    writer: identityOutputManifest.writers[0],
  };
  for (const plan of identityPlans) {
    const loss = identityLoss(plan.loss, "bound-subject", {
      subjects: { [plan.subject]: "bound-subject" },
      otherCampus: "bound-campus",
    });
    const projected = outgoing(
      { ...plan, phase: loss.contention, writer: loss.writer },
      plan,
    );
    check(() => assert.equal(projected.identity_context.id, plan.id));
    check(() =>
      assert.equal(projected.identity_context.phase, loss.contention),
    );
    check(() => assert.equal(projected.identity_context.writer, loss.writer));
  }
  const secret =
    "provider-key 00000000-0000-4000-8000-000000000000 private narrative 42501 Safety report unavailable";
  const before = Object.fromEntries(censusTables.map((table) => [table, []]));
  const after = structuredClone(before);
  after["auth.users"].push({
    id: secret,
    raw_user_meta_data: { email: secret },
  });
  after["storage.objects"].push({ name: secret, provider_key: secret });
  for (const status of identityOutputManifest.statuses)
    for (const partition of identityOutputManifest.partitions)
      for (const classification of identityOutputManifest.classifications) {
        const result = outgoing(
          {
            ...context,
            status,
            partition,
            classification,
            full54_before: before,
            full54_after: after,
            full54_expected: before,
            diagnostics: [
              { code: "42501", message: "Safety report unavailable" },
            ],
            error: new Error(secret),
            subject_id: secret,
            result: { receipt_id: secret },
          },
          cell,
        );
        check(() => assert.equal(result.identity_context.id, cell.id));
        check(() => assert.equal(result.full54_after["auth.users"].count, 1));
        check(() => assert.ok(!JSON.stringify(result).includes(secret)));
      }
  for (const candidate of [
    { ...context, id: cell.id + secret },
    { ...context, route: "CB" },
    { ...context, order: "operation-first" },
    { ...context, phase: "account" + secret },
    { ...context, writer: "private provider" },
  ])
    check(() =>
      assert.deepEqual(outgoing(candidate, cell).identity_context, {}),
    );
  let getterCalls = 0;
  const accessor = Object.defineProperty({}, "id", {
    enumerable: true,
    get() {
      getterCalls++;
      throw new Error(secret);
    },
  });
  check(() => assert.deepEqual(outgoing(accessor, cell).identity_context, {}));
  const cycle = {};
  cycle.self = cycle;
  const arbitrary = [
    new Error(secret),
    { message: secret, cause: cycle },
    accessor,
    cycle,
  ];
  for (const original of arbitrary) {
    const safe = safeError(
      original,
      { outcome: { ...context, full54_before: after } },
      cell,
    );
    check(() => assert.equal(privateState(safe).original, original));
    check(() => assert.ok(!JSON.stringify(safe).includes(secret)));
    check(() => assert.equal(own(safe, "cause"), undefined));
    const closeError = safeError(
      safe,
      { cleanupIncomplete: true, closeError: new Error(secret) },
      cell,
    );
    check(() => assert.equal(privateState(closeError).original, original));
    check(() => assert.equal(privateState(closeError).cleanupIncomplete, true));
  }
  check(() => assert.equal(getterCalls, 0));
  const original = new Error(secret),
    blocker = {
      ...context,
      originalError: original,
      full54_before: after,
      status: "blocked-uncredited",
    };
  const unavailable = identityObservationFailure(
    outgoing(blocker, cell),
    new Error(secret),
  );
  check(() => assert.equal(privateState(unavailable).original, original));
  check(() =>
    assert.equal(privateState(unavailable).outcome.full54_race_rollback, null),
  );
  check(() =>
    assert.equal(
      privateState(identitySuiteFailure([outgoing(blocker, cell)])).original,
      original,
    ),
  );
  check(() => assert.ok(!JSON.stringify(unavailable).includes(secret)));
  for (const receipt of [
    [0, null],
    [1, null],
  ])
    check(() => validateExit(receipt));
  for (const receipt of [
    [null, null],
    [1, "SIGKILL"],
    [0.5, null],
    [0],
    [0, null, null],
  ])
    check(() => assert.throws(() => validateExit(receipt)));
  for (const mode of [
    "zero",
    "denial",
    "abort",
    "unknown",
    "signal",
    "close-reject",
    "done-reject",
  ]) {
    let closeCalls = 0,
      doneCalls = 0;
    const receipt =
      mode === "signal" ? [null, "SIGKILL"] : [mode === "zero" ? 0 : 1, null];
    const child = {
      close: async () => {
        closeCalls++;
        if (mode === "close-reject") throw original;
      },
      get done() {
        doneCalls++;
        return mode === "done-reject"
          ? Promise.reject(original)
          : Promise.resolve(receipt);
      },
      output: () =>
        mode === "abort"
          ? "ERROR: 40P01: deadlock detected"
          : mode === "denial"
            ? "ERROR: 42501: Safety report unavailable"
            : "",
    };
    sessions.set(child, {
      expectedDenial: false,
      accepted: mode === "zero",
    });
    if (mode === "denial") denied(child, receipt, { id: "CH" });
    if (["zero", "denial", "abort"].includes(mode))
      await awaitOwnedClose(child);
    else {
      await assert.rejects(awaitOwnedClose(child));
      checks++;
    }
    check(() => assert.equal(closeCalls, 1));
    check(() => assert.equal(doneCalls, 1));
    if (mode !== "zero")
      check(() => assert.throws(() => requireAccepted([child])));
    if (mode === "denial") {
      check(() => assert.throws(() => acceptDenial(child)));
      acceptDenial(child, true);
      check(() => requireAccepted([child]));
    }
  }
  for (const output of [
    "ERROR: 40P01: deadlock detected",
    "ERROR: 42501: private narrative",
    "ERROR: 42501: Safety report unavailable\nERROR: 42501: extra",
    "ERROR: 42501: Safety report unavailable\nRESULT:true",
    "ERROR: 42501: Safety report unavailable\nDONE",
    "ERROR: 57014: canceling statement due to statement timeout",
  ]) {
    const child = { output: () => output };
    sessions.set(child, { expectedDenial: false });
    check(() => assert.throws(() => denied(child, [1, null], { id: "CH" })));
    check(() => assert.equal(sessions.get(child).expectedDenial, false));
  }
  const delta = projectDifferences(differences(before, after));
  check(() => assert.ok(delta.some((item) => item.table === "auth.users")));
  check(() => assert.ok(!JSON.stringify(delta).includes(secret)));
  for (const [binding, count] of [
    [null, 0],
    [{ pid: 0, name: "owned" }, 0],
    [{ pid: 1, name: "other" }, 0],
    [{ pid: 1, name: "owned" }, 1],
    [{ pid: 1, name: "owned" }, null],
    [{ pid: 1, name: "owned" }, "0"],
  ])
    check(() =>
      assert.throws(() => assertAbsentBackend(binding, "owned", count)),
    );
  check(() => assertAbsentBackend({ pid: 1, name: "owned" }, "owned", 0));
  const savedError = console.error,
    records = [],
    state = { ...context, diagnostics: [], failureRecorded: true };
  try {
    console.error = (text) => records.push(JSON.parse(text));
    failureRecord(original, cell, state, before);
    failureRecord(original, cell, state, after);
    failureRecord(original, cell, state, null, new Error(secret));
    check(() => assert.equal(records.length, 3));
    check(() =>
      assert.equal(records[1].committed_census["auth.users"].count, 1),
    );
    check(() => assert.ok(!JSON.stringify(records).includes(secret)));
    console.error = () => {
      throw new Error(secret);
    };
    failureRecord(original, cell, state, after);
    check(() => assert.equal(state.outputErrors.length, 1));
    check(() =>
      assert.equal(
        privateState(safeError(original, { outcome: state }, cell)).original,
        original,
      ),
    );
  } finally {
    console.error = savedError;
  }
  const source = readFileSync(new URL(import.meta.url), "utf8");
  check(() =>
    assert.match(
      source,
      /async function runIdentityPlansInner\(options\) \{\s*requireReviewedIdentityRelease\(\);/,
    ),
  );
  check(() => assert.equal(validateIdentityPlans().literal_cells, 204));
  check(() => assert.equal(identityOutputManifest.losses.length, 17));
  return { checks, executed_cells: 0, target_contacts: 0 };
}

// Parser is supplied only to this explicit memory/read-only source example.
export function runIdentityPreservationExamples(parse) {
  const expected = {
    functions: {
      identitySessionNames:
        "41bedd6b18e60c22df339a837c2b48aa28036ac78dd146bcb207000cb067f3dc",
      validateIdentityPlans:
        "cd697e4a849ad6f2202f24f59390769d6f3328a2456bea16e1aa70e40c4679a1",
      equal54:
        "8bb12f07f3d3b56bfd1d70b7cdeea8b825e708adf2db1c26168f7abe5cd3332d",
      row: "07328748375d85a03e0f6709597f3b66fe4932350452d6c3ea7f3512c1a33ebd",
      expectedIdentityLoss:
        "6f615e8f69164719b982658154d429d59a6a456694c01c6f49269b839ddc24b6",
      marked:
        "97859ea470b460dedef32ba74676eee6b31abdb32e5bfab8f3bfc301336aff0f",
      diagnostic:
        "7e0b423526915a10fe912c1c904d6f8e058a55fa82c3f97d55a1d801add493b0",
      expectedOperation:
        "14b9a21a107a6031f9757b5814d0d56c38f4dcc7b33e64773d7c9943c5284f67",
    },
    values: {
      identityPlans:
        "b8b74ea8084aad04fb2b4f1c74506ba4390fae95479f5496cf73d74d562f184d",
      sorted:
        "4330b2ae8e17fcc4e830b90d9ba4a2bf231e4098725cbb2b818b1e645670636a",
      timestamp:
        "005cc55e2e0968908e1e383d6def40bf424360b5b5bf483364cfb9375d64d00f",
      rpcSQL:
        "749864f84040697f3cc9899c09479edd8aa357108a1f9ead7ffa74e3c1b19a71",
      snapshotSQL:
        "4cbb78e8d590b0c72bb9c5ac05b44477eb1c06ef8afd5a7cb85e69b0877176fe",
      beginSQL:
        "724d76927391ee5f583e4908929c7c29ea010b0f5524d05595914d8c27ae6da6",
    },
  };
  const normalize = (value) =>
    Array.isArray(value)
      ? value.map(normalize)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .filter(
                ([key]) =>
                  !["start", "end", "range", "loc", "raw"].includes(key),
              )
              .map(([key, item]) => [key, normalize(item)]),
          )
        : value;
  const hash = (value) =>
    createHash("sha256")
      .update(JSON.stringify(normalize(value)))
      .digest("hex");
  const tree = parse(readFileSync(new URL(import.meta.url), "utf8"));
  const declarations = tree.body.map((node) =>
    node.type === "ExportNamedDeclaration" ? node.declaration : node,
  );
  for (const [name, digest] of Object.entries(expected.functions))
    assert.equal(
      hash(
        declarations.find(
          (node) =>
            node?.type === "FunctionDeclaration" && node.id.name === name,
        ),
      ),
      digest,
      name,
    );
  const values = declarations
    .filter((node) => node?.type === "VariableDeclaration")
    .flatMap((node) => node.declarations);
  for (const [name, digest] of Object.entries(expected.values))
    assert.equal(
      hash(values.find((node) => node.id.name === name).init),
      digest,
      name,
    );
  const expectedRaw = {
    positiveRollback: [
      "345101414f6c7fd19e8c4678ca8a2735cb264d98913535d22d5902f7cee08f03",
      "25fd37a701d571e605203afecc87e696edde9fbfa741b3c85b267151b754acd5",
      "d2e4a452548880ea7c441e578424cd9d2e60a57f46b14c61298748fbf7147838",
      "0c5b08ecc62b0edbd2096634b28c0d8f8279763c30db1a8f275ec4c0c6a1eeaa",
    ],
    freshAfterLoss: [
      "85b3b3456c1ff3f702d529daa3f20defa0afca7be6d27b19e944879d4b50d72f",
      "4942c0d21785f55d81403b0f57faac1b2bee923f3e7e8a213b59882a3c3fe13f",
      "f678578814ff01661cd2d36a823e9a6185cba4467482e8d21539f8db53c8aff4",
      "409660525c1ea3b76ac532ae4f4faed4801609c3dd3fc3a33033e45aaec6e3eb",
      "61d42eefe633bac7722f34c794df81d523754963647ae8058b948be87a6e87ab",
      "22182d20aa075cc8d73b5e855be91259a3ff7fcad81bf7c210ecc3210ca241c9",
    ],
    runIdentityCell: [
      "bc5936f57bce79079ed41b6c7171fcf5aa0be1b34f82768e7d718ebe78aa836c",
      "a7d51c7010711334bd2cb6b1f3da071abef1ac1a1cde07301ec694cf88a655d8",
      "1801fc61837b0ab8575771524e74b0f0989bfd1d5d2e5971b7e88d8f4ba6ace2",
      "8d47bdf0c21f9ddfcb10ed32d8aae6be889789a0260f76bafa5ff36418224f2d",
      "42ff3f90c7f566732c75764a23ba3976202675a40201172e5539a213223f71bb",
      "476fe42aac6cd6c289406269d0ab62eeede0e57a73fc62c597cfeea8f3c6e7ce",
      "1853d47f364ace02d47c7634ddd85b2e05ca0b579dcfcf5de1f36a6980262e0a",
      "2779ebb48ca5a871542a7db9913375efd2239ea31e91f52159c358d220dcfee2",
      "a4798e4a0fbbef903301bc960c900d16ca20be4376a49e45bde964f41601d2fb",
      "b1be4db79d7051ea6a8d9ace119f840df0c6338e77d1f05ea3d45cc8f7b4e65a",
    ],
  };
  const collect = (node, out) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression") out.push(hash(node));
    for (const value of Object.values(node))
      if (Array.isArray(value)) value.forEach((item) => collect(item, out));
      else if (value && typeof value === "object") collect(value, out);
  };
  for (const [name, digests] of Object.entries(expectedRaw)) {
    const actual = [];
    collect(
      declarations.find(
        (node) =>
          node?.type === "FunctionDeclaration" &&
          node.id.name === name + "Inner",
      ),
      actual,
    );
    for (const digest of digests) {
      const index = actual.indexOf(digest);
      assert.ok(index >= 0, name + " preserved raw assertion");
      actual.splice(index, 1);
    }
  }
  return {
    unchanged_functions: 8,
    unchanged_values: 6,
    preserved_raw_assertions: 20,
    executed_cells: 0,
  };
}
